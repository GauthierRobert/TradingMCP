// CLI for alpaca-mean-reversion — a SYMMETRIC mean-reversion engine for US equities/ETFs (paper).
// The opposite logic to the momentum scalpers:
//   * OVERSOLD  (RSI<entryRsi)     + first bounce up   -> BUY long,  exit as it reverts UP to the mean
//   * OVERBOUGHT (RSI>overboughtRsi) + first rejection -> SELL short, cover as it reverts DOWN to the mean
// Designed to ACT in stretched tape (selloffs AND blowoffs) where the trend-followers stay flat.
// Long/short/flat, commission-free (spread-only floor), IEX 1Min data resampled to ~15Min, market-
// hours gated, auth required. SIMULATION/paper by default.
//
//   node run.mjs scan   "SPY,QQQ,..."                     # oversold/overbought candidates + would-trade
//   node run.mjs decide "SLV"                              # full signal for one symbol
//   node run.mjs tick   "SPY,QQQ,..." 100000 [brief]      # autopilot: ready-to-execute plan per symbol
//   node run.mjs opened "SLV"  long  61.9 16              # record a BUY  fill (side px qty)
//   node run.mjs opened "NVDA" short 210  7               # record a SHORT fill (side px qty)
//   node run.mjs closed "SLV"  63.4                       # record the closing fill -> logs net pnl
//   node run.mjs review                                   # win-rate / avg net pnl from logged trades
//   node run.mjs status                                  # params + open positions
//
// Auth: ALPACA_API_KEY / ALPACA_SECRET_KEY from environment. Data feed: IEX (free). Liquid names only.
import { emaArray, rsiArray } from '../alpaca-equity-scalper/scalper.mjs';
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(HERE, '_state');
const PARAMS = join(STATE_DIR, 'params.json');
const POSITIONS = join(STATE_DIR, 'positions.json');
const OUTCOMES = join(STATE_DIR, 'outcomes.ndjson');

// ---- default knobs (live in _state/params.json once written; edit there to tune) ----
const DEFAULTS = {
  tf: 15,             // resample 1Min -> this many minutes for the RSI/EMA read
  rsiP: 14,           // RSI period (on resampled bars)
  entryRsi: 30,       // LONG: RSI must have dipped <= this recently (oversold)
  overboughtRsi: 70,  // SHORT: RSI must have spiked >= this recently (overbought)
  enableShort: true,  // allow the short (overbought) side
  lookback: 3,        // how many recent bars to look back for the dip/spike
  emaSpan: 20,        // mean-reversion target = EMA(emaSpan) of resampled closes
  tpCapPct: 0.04,     // cap the take-profit target at 4% from entry
  minTpPct: 0.008,    // floor the target at 0.8% (must clear spread + give edge)
  stopPct: 0.025,     // hard stop 2.5% (mean-reversion needs room)
  swingN: 6,          // also stop just past the swing low (long) / swing high (short) of last N bars
  exitRsi: 55,        // LONG exit: RSI mean-reverted UP to here
  exitRsiShort: 45,   // SHORT exit: RSI mean-reverted DOWN to here
  maxHoldBars: 26,    // time stop (26 * tf min ≈ ~1 RTH day at tf=15)
  trailPct: 0.02,     // once in profit, trail this far off the peak (long) / trough (short)
  riskPct: 0.01,      // risk 1% of equity per trade (sizes off the stop)
  maxWeight: 0.15,    // cap any single position at 15% of equity
  spreadEst: 0.0008,  // ~8 bps spread-only round-trip floor (commission-free)
  feed: 'iex',
};

// ---- Alpaca stock bars (IEX), auth required ----
const KEY = process.env.ALPACA_API_KEY, SEC = process.env.ALPACA_SECRET_KEY;
const DATA = 'https://data.alpaca.markets/v2/stocks';
const FEED = 'iex';
const BAR_AGE_OPEN_MS = 20 * 60 * 1000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const normSym = (s) => String(s || 'SPY').toUpperCase().replace(/[^A-Z.]/g, '');
const daysAgoISO = (d) => new Date(Date.now() - d * 864e5).toISOString();
function authHeaders() {
  if (!KEY || !SEC) throw new Error('ALPACA_API_KEY / ALPACA_SECRET_KEY not in environment — stock data needs auth.');
  return { 'APCA-API-KEY-ID': KEY, 'APCA-API-SECRET-KEY': SEC };
}
async function fetchBars(symbol, { start } = {}) {
  const sym = normSym(symbol);
  const all = []; let pageToken = null;
  do {
    const u = new URL(`${DATA}/bars`);
    u.searchParams.set('symbols', sym); u.searchParams.set('timeframe', '1Min');
    u.searchParams.set('feed', FEED); u.searchParams.set('limit', '10000');
    if (start) u.searchParams.set('start', start);
    if (pageToken) u.searchParams.set('page_token', pageToken);
    let r, tries = 0;
    do { r = await fetch(u, { headers: authHeaders() }); if (r.status === 429) { await sleep(1500 * ++tries); continue; } break; } while (tries < 5);
    if (!r.ok) throw new Error(`${sym} ${r.status} ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    const bars = (j.bars && j.bars[sym]) || [];
    all.push(...bars.map(b => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v, t: b.t })));
    pageToken = j.next_page_token;
  } while (pageToken);
  return all;
}
const marketOpenFromBars = (c) => { const last = c[c.length - 1]; return !!last && (Date.now() - Date.parse(last.t)) < BAR_AGE_OPEN_MS; };

// Resample 1Min bars into tf-minute buckets by clock (handles overnight gaps naturally).
function resample(bars, tfMin) {
  if (tfMin <= 1) return bars;
  const out = [], byKey = new Map();
  for (const b of bars) {
    const key = Math.floor(Date.parse(b.t) / (tfMin * 60000));
    let g = byKey.get(key);
    if (!g) { g = { o: b.o, h: b.h, l: b.l, c: b.c, v: b.v, t: b.t }; byKey.set(key, g); out.push(g); }
    else { g.h = Math.max(g.h, b.h); g.l = Math.min(g.l, b.l); g.c = b.c; g.v += b.v; }
  }
  return out;
}

// ---- the symmetric mean-reversion signal (pure; given resampled bars + knobs) ----
function signal(bars, position, k) {
  const need = k.rsiP + k.lookback + 2;
  const last = bars[bars.length - 1];
  if (!last || bars.length < need) return { action: 'HOLD', reason: 'not enough bars', price: last?.c, rsi: null };
  const close = bars.map(b => b.c);
  const rsi = rsiArray(close, k.rsiP);
  const ema = emaArray(close, k.emaSpan);
  const i = bars.length - 1;
  const c = close[i], rNow = rsi[i], rPrev = rsi[i - 1], bar = bars[i];
  const range = Math.max(bar.h - bar.l, 1e-9);

  // ---------- EXIT held LONG ----------
  if (position?.long) {
    const entry = position.entryPx, peak = Math.max(position.peakSince || entry, c), held = position.heldBars || 0;
    const gainPct = (c - entry) / entry, tgt = position.target ?? Infinity, stp = position.stop ?? 0;
    if (c <= stp) return { action: 'SELL', reason: `hard stop ${stp.toFixed(2)} hit`, price: c, rsi: rNow, gainPct };
    if (c >= tgt) return { action: 'SELL', reason: `target ${tgt.toFixed(2)} reached`, price: c, rsi: rNow, gainPct };
    if (rNow >= k.exitRsi) return { action: 'SELL', reason: `RSI reverted up to ${rNow.toFixed(0)} (>= ${k.exitRsi})`, price: c, rsi: rNow, gainPct };
    if (held >= k.maxHoldBars) return { action: 'SELL', reason: `time stop (${held} bars)`, price: c, rsi: rNow, gainPct };
    if (gainPct > 0 && c <= peak * (1 - k.trailPct)) return { action: 'SELL', reason: `trail off peak ${peak.toFixed(2)}`, price: c, rsi: rNow, gainPct };
    return { action: 'HOLD', reason: `long (gain ${(gainPct * 100).toFixed(2)}%, rsi ${rNow.toFixed(0)})`, price: c, rsi: rNow, gainPct };
  }

  // ---------- EXIT held SHORT (cover) ----------
  if (position?.short) {
    const entry = position.entryPx, trough = Math.min(position.troughSince || entry, c), held = position.heldBars || 0;
    const gainPct = (entry - c) / entry, tgt = position.target ?? 0, stp = position.stop ?? Infinity;
    if (c >= stp) return { action: 'COVER', reason: `hard stop ${stp.toFixed(2)} hit`, price: c, rsi: rNow, gainPct };
    if (c <= tgt) return { action: 'COVER', reason: `target ${tgt.toFixed(2)} reached`, price: c, rsi: rNow, gainPct };
    if (rNow <= k.exitRsiShort) return { action: 'COVER', reason: `RSI reverted down to ${rNow.toFixed(0)} (<= ${k.exitRsiShort})`, price: c, rsi: rNow, gainPct };
    if (held >= k.maxHoldBars) return { action: 'COVER', reason: `time stop (${held} bars)`, price: c, rsi: rNow, gainPct };
    if (gainPct > 0 && c >= trough * (1 + k.trailPct)) return { action: 'COVER', reason: `trail off trough ${trough.toFixed(2)}`, price: c, rsi: rNow, gainPct };
    return { action: 'HOLD', reason: `short (gain ${(gainPct * 100).toFixed(2)}%, rsi ${rNow.toFixed(0)})`, price: c, rsi: rNow, gainPct };
  }

  // ---------- ENTRY (flat): LONG on oversold bounce, SHORT on overbought rejection ----------
  const dipRsi = Math.min(...rsi.slice(i - k.lookback, i + 1));
  const spikeRsi = Math.max(...rsi.slice(i - k.lookback, i + 1));
  // LONG: was oversold, RSI turning up, bar closed strong & not still falling
  if (dipRsi <= k.entryRsi) {
    const turningUp = rNow > rPrev, closedStrong = c > bar.l + 0.25 * range, greenTick = c >= close[i - 1];
    if (turningUp && closedStrong && greenTick) {
      const swingLow = Math.min(...bars.slice(Math.max(0, i - k.swingN + 1), i + 1).map(b => b.l));
      const target = Math.min(Math.max(ema[i], c * (1 + k.minTpPct)), c * (1 + k.tpCapPct));
      const stop = Math.min(c * (1 - k.stopPct), swingLow * 0.999);
      return { action: 'BUY', side: 'long', reason: `oversold-bounce: rsi dipped ${dipRsi.toFixed(0)}, now ${rNow.toFixed(0)} & turning up`,
        price: c, rsi: rNow, target: +target.toFixed(2), stop: +stop.toFixed(2), stopPct: +((c - stop) / c).toFixed(4), ema: +ema[i].toFixed(2) };
    }
    return { action: 'HOLD', reason: `oversold (${dipRsi.toFixed(0)}) but no bounce yet`, price: c, rsi: rNow };
  }
  // SHORT: was overbought, RSI turning down, bar closed weak & not still rising
  if (k.enableShort && spikeRsi >= k.overboughtRsi) {
    const turningDown = rNow < rPrev, closedWeak = c < bar.h - 0.25 * range, redTick = c <= close[i - 1];
    if (turningDown && closedWeak && redTick) {
      const swingHigh = Math.max(...bars.slice(Math.max(0, i - k.swingN + 1), i + 1).map(b => b.h));
      const target = Math.max(Math.min(ema[i], c * (1 - k.minTpPct)), c * (1 - k.tpCapPct));
      const stop = Math.max(c * (1 + k.stopPct), swingHigh * 1.001);
      return { action: 'SHORT', side: 'short', reason: `overbought-fade: rsi spiked ${spikeRsi.toFixed(0)}, now ${rNow.toFixed(0)} & turning down`,
        price: c, rsi: rNow, target: +target.toFixed(2), stop: +stop.toFixed(2), stopPct: +((stop - c) / c).toFixed(4), ema: +ema[i].toFixed(2) };
    }
    return { action: 'HOLD', reason: `overbought (${spikeRsi.toFixed(0)}) but no rejection yet`, price: c, rsi: rNow };
  }
  return { action: 'HOLD', reason: `neutral (rsi ${rNow.toFixed(0)})`, price: c, rsi: rNow };
}

// ---- state helpers ----
function loadParams() { if (!existsSync(PARAMS)) { mkdirSync(STATE_DIR, { recursive: true }); writeFileSync(PARAMS, JSON.stringify(DEFAULTS, null, 2)); return { ...DEFAULTS }; } return { ...DEFAULTS, ...JSON.parse(readFileSync(PARAMS, 'utf8')) }; }
function loadPositions() { return existsSync(POSITIONS) ? JSON.parse(readFileSync(POSITIONS, 'utf8')) : {}; }
function savePositions(p) { if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true }); writeFileSync(POSITIONS, JSON.stringify(p, null, 2)); }
function logOutcome(rec) { if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true }); appendFileSync(OUTCOMES, JSON.stringify(rec) + '\n'); }

// derive peak/trough & held-bars for a held position from fresh bars
function reconcileHeld(held, bars) {
  let peak = held.entryPx, trough = held.entryPx, heldBars = 0;
  for (const b of bars) if (held.openedBarTime && b.t > held.openedBarTime) { heldBars++; if (b.h > peak) peak = b.h; if (b.l < trough) trough = b.l; }
  return { ...held, peakSince: peak, troughSince: trough, heldBars };
}

// ---- CLI ----
const [cmd, ...args] = process.argv.slice(2);
const k = loadParams();
const BASKET = 'SPY,QQQ,IWM,GLD,SLV,USO,TLT,AAPL,MSFT,NVDA,AMZN,META';

if (cmd === 'scan') {
  const symbols = (args[0] || BASKET).split(',').map(normSym);
  console.log(`=== mean-reversion scan (IEX, tf=${k.tf}m, long<${k.entryRsi} / short>${k.overboughtRsi}${k.enableShort ? '' : ' [short OFF]'}) ===`);
  for (const sym of symbols) {
    const bars = resample(await fetchBars(sym, { start: daysAgoISO(20) }), k.tf);
    const open = marketOpenFromBars(bars);
    const sig = signal(bars, { long: false }, k);
    const tag = !open ? '(market closed)'
      : sig.action === 'BUY' ? `*** BUY long  tgt ${sig.target} stop ${sig.stop}`
      : sig.action === 'SHORT' ? `*** SELL short  tgt ${sig.target} stop ${sig.stop}`
      : sig.reason;
    console.log(`${sym.padEnd(6)} @ ${String(sig.price ?? '-').padStart(9)}  rsi ${String(sig.rsi?.toFixed(1) ?? '-').padStart(5)}  -> ${tag}`);
  }
}

else if (cmd === 'decide') {
  const sym = normSym(args[0] || 'SLV');
  const bars = resample(await fetchBars(sym, { start: daysAgoISO(20) }), k.tf);
  const pos = loadPositions()[sym] || { long: false };
  const sig = signal(bars, (pos.long || pos.short) ? reconcileHeld(pos, bars) : pos, k);
  console.log(JSON.stringify({ symbol: sym, tf: k.tf, bars: bars.length, marketOpen: marketOpenFromBars(bars),
    lastBarTime: bars[bars.length - 1]?.t, position: pos, signal: sig }, null, 2));
}

else if (cmd === 'tick') {
  const symbols = (args[0] || BASKET).split(',').map(normSym);
  const equity = +(args[1] || 100000);
  const brief = args.includes('brief');
  const positions = loadPositions();
  const plan = []; let anyOpen = false;
  for (const sym of symbols) {
    const bars = resample(await fetchBars(sym, { start: daysAgoISO(20) }), k.tf);
    const last = bars[bars.length - 1];
    const open = marketOpenFromBars(bars); if (open) anyOpen = true;
    const held = positions[sym] && (positions[sym].long || positions[sym].short) ? positions[sym] : null;
    if (!open) { plan.push({ sym, holding: !!held, action: 'HOLD', reason: 'market closed', price: last?.c, marketOpen: false, order: null }); continue; }
    if (held) {
      const hp = reconcileHeld(held, bars);
      positions[sym] = { ...held, peak: hp.peakSince, trough: hp.troughSince, heldBars: hp.heldBars };
      const sig = signal(bars, hp, k);
      const closing = sig.action === 'SELL' || sig.action === 'COVER';
      plan.push({ sym, holding: true, side: held.long ? 'long' : 'short', action: sig.action, reason: sig.reason, price: last.c, marketOpen: true,
        gainPct: sig.gainPct != null ? +(sig.gainPct * 100).toFixed(2) : null, entryPx: held.entryPx, qty: held.qty,
        execute: closing ? `close_position("${sym}") then: node run.mjs closed "${sym}" <fillPx>` : null });
    } else {
      const sig = signal(bars, { long: false }, k);
      let order = null;
      if (sig.action === 'BUY' || sig.action === 'SHORT') {
        let notional = equity * k.riskPct / Math.max(sig.stopPct, 0.005);
        const cap = equity * k.maxWeight; if (notional > cap) notional = cap;
        const qty = +(notional / last.c).toFixed(4);
        const aSide = sig.action === 'BUY' ? 'buy' : 'sell';
        const sizeArg = sig.action === 'BUY' ? `notional=${(+notional.toFixed(2))}` : `qty=${qty}`;
        order = { side: sig.side, notional: +notional.toFixed(2), qty, target: sig.target, stop: sig.stop,
          execute: `place_stock_order("${sym}","${aSide}",${sizeArg},type="limit",limit_price=${last.c},time_in_force="day") then: node run.mjs opened "${sym}" ${sig.side} <fillPx> <fillQty>` };
      }
      plan.push({ sym, holding: false, action: sig.action, reason: sig.reason, price: last.c, marketOpen: true, rsi: sig.rsi != null ? +sig.rsi.toFixed(1) : null, order });
    }
  }
  savePositions(positions);
  const out = { ts: new Date().toISOString(), venue: 'alpaca-meanrev', feed: FEED, tf: k.tf, marketOpen: anyOpen, equity, plan };
  if (brief) { out.scanned = plan.length; out.held = plan.filter(p => p.holding).map(p => `${p.side || ''}:${p.sym}@${p.entryPx}`); out.plan = plan.filter(p => p.action !== 'HOLD'); }
  console.log(JSON.stringify(out, null, brief ? 0 : 2));
}

else if (cmd === 'opened') {
  const sym = normSym(args[0]); const side = (args[1] || 'long').toLowerCase();
  const fillPx = +args[2], fillQty = +args[3];
  const bars = resample(await fetchBars(sym, { start: daysAgoISO(5) }), k.tf);
  const sig = signal(bars, { long: false }, k);
  const positions = loadPositions();
  const base = { entryPx: fillPx, qty: fillQty, peak: fillPx, peakSince: fillPx, trough: fillPx, troughSince: fillPx, heldBars: 0,
    openedAt: new Date().toISOString(), openedBarTime: bars[bars.length - 1]?.t };
  if (side === 'short') positions[sym] = { ...base, short: true, target: sig.target ?? +(fillPx * (1 - k.tpCapPct)).toFixed(2), stop: sig.stop ?? +(fillPx * (1 + k.stopPct)).toFixed(2) };
  else positions[sym] = { ...base, long: true, target: sig.target ?? +(fillPx * (1 + k.tpCapPct)).toFixed(2), stop: sig.stop ?? +(fillPx * (1 - k.stopPct)).toFixed(2) };
  savePositions(positions);
  console.log('opened', side, sym, JSON.stringify(positions[sym]));
}

else if (cmd === 'closed') {
  const sym = normSym(args[0]); const fillPx = +args[1];
  const positions = loadPositions(); const p = positions[sym];
  if (!p) { console.log('no open position tracked for', sym); }
  else {
    const side = p.short ? 'short' : 'long';
    const gross = side === 'short' ? (p.entryPx - fillPx) / p.entryPx : (fillPx - p.entryPx) / p.entryPx;
    const net = gross - k.spreadEst;
    const rec = { ts: new Date().toISOString(), sym, side, entryPx: p.entryPx, exitPx: fillPx, qty: p.qty, grossPct: +(gross * 100).toFixed(3), netPct: +(net * 100).toFixed(3), win: net > 0 };
    logOutcome(rec); delete positions[sym]; savePositions(positions);
    console.log('closed', side, sym, '| net pnl%', rec.netPct, '| recorded');
  }
}

else if (cmd === 'review') {
  if (!existsSync(OUTCOMES)) { console.log('no trades logged yet.'); }
  else {
    const rows = readFileSync(OUTCOMES, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    const n = rows.length, wins = rows.filter(r => r.win).length;
    const avg = rows.reduce((s, r) => s + r.netPct, 0) / (n || 1), sum = rows.reduce((s, r) => s + r.netPct, 0);
    console.log(`=== mean-reversion review (${n} closed trades) ===`);
    console.log(`win rate ${(100 * wins / (n || 1)).toFixed(0)}%  |  avg net ${avg.toFixed(3)}%/trade  |  cumulative ${sum.toFixed(2)}%`);
    for (const r of rows.slice(-12)) console.log(`  ${r.ts.slice(0, 16)}  ${(r.side || 'long').padEnd(5)} ${r.sym.padEnd(5)}  ${r.entryPx} -> ${r.exitPx}  net ${r.netPct >= 0 ? '+' : ''}${r.netPct}%`);
  }
}

else if (cmd === 'status') {
  console.log(JSON.stringify({ params: k, positions: loadPositions() }, null, 2));
}

else {
  console.log('commands: scan | decide | tick | opened | closed | review | status');
}
