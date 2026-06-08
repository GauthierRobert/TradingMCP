// CLI for binance-mean-reversion — a SYMMETRIC mean-reversion engine for Binance SPOT (sim-first).
// The opposite logic to the momentum scalpers:
//   * OVERSOLD  (RSI<entryRsi)     + first bounce up   -> BUY long,  exit as it reverts UP to the mean
//   * OVERBOUGHT (RSI>overboughtRsi) + first rejection -> SHORT,     cover as it reverts DOWN to the mean
//
// ⚠️ BINANCE SPOT HAS NO SHORTING. The long side executes (simulated unless BINANCE_TRADING_ENABLED
// =true + keys, exactly like the scalpers). The SHORT side is **simulation-only** — it logs what a
// short WOULD do (paper P&L) but never places a real sell-to-open (that needs margin/futures, which
// this spot skill does not touch). Set enableShort:false to drop it entirely.
//
// 24/7 (no market-hours gate); cost floor is Binance's ~0.10%/fill (~0.20% round-trip), higher than
// the commission-free equity engine, so targets must clear more. Public klines, no auth for data.
//
//   node run.mjs scan   "BTCUSDT,ETHUSDT,..."             # oversold/overbought candidates + would-trade
//   node run.mjs decide "SOLUSDT"                         # full signal for one symbol
//   node run.mjs tick   "BTCUSDT,ETHUSDT,..." 100000 [brief]
//   node run.mjs opened "SOLUSDT" long  140 7            # record a BUY  fill (side px qty)
//   node run.mjs opened "SOLUSDT" short 160 7            # record a SIM short (side px qty)
//   node run.mjs closed "SOLUSDT" 150                    # record the closing fill -> logs net pnl
//   node run.mjs review | status
import { emaArray, rsiArray } from '../binance-adaptive-scalper/scalper.mjs';
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(HERE, '_state');
const PARAMS = join(STATE_DIR, 'params.json');
const POSITIONS = join(STATE_DIR, 'positions.json');
const OUTCOMES = join(STATE_DIR, 'outcomes.ndjson');

// ---- default knobs (crypto-tuned: higher cost floor, more volatility room) ----
const DEFAULTS = {
  tf: 15,             // resample 1m -> this many minutes for the RSI/EMA read
  rsiP: 14,
  entryRsi: 30,       // LONG: RSI dipped <= this recently (oversold)
  overboughtRsi: 70,  // SHORT (sim): RSI spiked >= this recently (overbought)
  enableShort: true,  // include the simulated short (overbought) side
  lookback: 3,
  emaSpan: 20,
  tpCapPct: 0.06,     // cap target at 6% (crypto moves more)
  minTpPct: 0.012,    // floor target at 1.2% — must clear ~0.20% round-trip fee with margin
  stopPct: 0.03,      // hard stop 3% (crypto needs room)
  swingN: 6,
  exitRsi: 55,
  exitRsiShort: 45,
  maxHoldBars: 26,
  trailPct: 0.025,
  riskPct: 0.01,
  maxWeight: 0.15,
  feeRt: 0.002,       // ~0.20% round-trip fee (Binance 0.10%/fill) — subtracted from gross pnl
  staleMin: 10,       // data older than this (min) => treat as stale, HOLD
};

// ---- Binance public klines (no auth), same fetch as the adaptive scalper ----
const HOSTS = ['https://api.binance.com', 'https://data-api.binance.vision', 'https://api-gcp.binance.com'];
const INTERVAL = '1m';
const BAR_MS = 60 * 1000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function normSym(s) {
  let x = String(s || 'BTCUSDT').toUpperCase().replace(/[\/\-_]/g, '');
  if (x.endsWith('USD') && !x.endsWith('USDT') && !x.endsWith('BUSD') && !x.endsWith('USDC')) x += 'T';
  return x;
}
async function klinesPage(symbol, { startTime, endTime, limit = 1000 } = {}) {
  let lastErr;
  for (const host of HOSTS) {
    const u = new URL(`${host}/api/v3/klines`);
    u.searchParams.set('symbol', symbol); u.searchParams.set('interval', INTERVAL); u.searchParams.set('limit', String(limit));
    if (startTime) u.searchParams.set('startTime', String(startTime));
    if (endTime) u.searchParams.set('endTime', String(endTime));
    try {
      let r, tries = 0;
      do { r = await fetch(u); if (r.status === 429 || r.status === 418) { await sleep(1500 * ++tries); continue; } break; } while (tries < 5);
      if (!r.ok) { lastErr = new Error(`${symbol} ${r.status} ${(await r.text()).slice(0, 200)}`); continue; }
      return await r.json();
    } catch (e) { lastErr = e; continue; }
  }
  throw lastErr || new Error(`klines failed for ${symbol}`);
}
async function fetchBars(symbol, { start } = {}) {
  const sym = normSym(symbol);
  let startTime = start ? Date.parse(start) : (Date.now() - 20 * 864e5);
  const endTime = Date.now(); const all = [];
  while (all.length < 30000) {
    const page = await klinesPage(sym, { startTime, endTime, limit: 1000 });
    if (!page.length) break;
    for (const x of page) all.push({ o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], t: new Date(x[0]).toISOString() });
    if (page.length < 1000) break;
    startTime = page[page.length - 1][0] + BAR_MS;
    if (startTime > endTime) break;
  }
  return all;
}
const daysAgoISO = (d) => new Date(Date.now() - d * 864e5).toISOString();
const fresh = (bars, staleMin) => { const last = bars[bars.length - 1]; return !!last && (Date.now() - Date.parse(last.t)) < staleMin * 60000; };

// Resample 1m bars into tf-minute buckets by clock.
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

// ---- symmetric mean-reversion signal (identical logic to the Alpaca engine) ----
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

  if (position?.long) {
    const entry = position.entryPx, peak = Math.max(position.peakSince || entry, c), held = position.heldBars || 0;
    const gainPct = (c - entry) / entry, tgt = position.target ?? Infinity, stp = position.stop ?? 0;
    if (c <= stp) return { action: 'SELL', reason: `hard stop ${stp.toFixed(4)} hit`, price: c, rsi: rNow, gainPct };
    if (c >= tgt) return { action: 'SELL', reason: `target ${tgt.toFixed(4)} reached`, price: c, rsi: rNow, gainPct };
    if (rNow >= k.exitRsi) return { action: 'SELL', reason: `RSI reverted up to ${rNow.toFixed(0)}`, price: c, rsi: rNow, gainPct };
    if (held >= k.maxHoldBars) return { action: 'SELL', reason: `time stop (${held} bars)`, price: c, rsi: rNow, gainPct };
    if (gainPct > 0 && c <= peak * (1 - k.trailPct)) return { action: 'SELL', reason: `trail off peak ${peak.toFixed(4)}`, price: c, rsi: rNow, gainPct };
    return { action: 'HOLD', reason: `long (gain ${(gainPct * 100).toFixed(2)}%, rsi ${rNow.toFixed(0)})`, price: c, rsi: rNow, gainPct };
  }
  if (position?.short) {
    const entry = position.entryPx, trough = Math.min(position.troughSince || entry, c), held = position.heldBars || 0;
    const gainPct = (entry - c) / entry, tgt = position.target ?? 0, stp = position.stop ?? Infinity;
    if (c >= stp) return { action: 'COVER', reason: `hard stop ${stp.toFixed(4)} hit`, price: c, rsi: rNow, gainPct };
    if (c <= tgt) return { action: 'COVER', reason: `target ${tgt.toFixed(4)} reached`, price: c, rsi: rNow, gainPct };
    if (rNow <= k.exitRsiShort) return { action: 'COVER', reason: `RSI reverted down to ${rNow.toFixed(0)}`, price: c, rsi: rNow, gainPct };
    if (held >= k.maxHoldBars) return { action: 'COVER', reason: `time stop (${held} bars)`, price: c, rsi: rNow, gainPct };
    if (gainPct > 0 && c >= trough * (1 + k.trailPct)) return { action: 'COVER', reason: `trail off trough ${trough.toFixed(4)}`, price: c, rsi: rNow, gainPct };
    return { action: 'HOLD', reason: `short[sim] (gain ${(gainPct * 100).toFixed(2)}%, rsi ${rNow.toFixed(0)})`, price: c, rsi: rNow, gainPct };
  }

  const dipRsi = Math.min(...rsi.slice(i - k.lookback, i + 1));
  const spikeRsi = Math.max(...rsi.slice(i - k.lookback, i + 1));
  if (dipRsi <= k.entryRsi) {
    const turningUp = rNow > rPrev, closedStrong = c > bar.l + 0.25 * range, greenTick = c >= close[i - 1];
    if (turningUp && closedStrong && greenTick) {
      const swingLow = Math.min(...bars.slice(Math.max(0, i - k.swingN + 1), i + 1).map(b => b.l));
      const target = Math.min(Math.max(ema[i], c * (1 + k.minTpPct)), c * (1 + k.tpCapPct));
      const stop = Math.min(c * (1 - k.stopPct), swingLow * 0.999);
      return { action: 'BUY', side: 'long', reason: `oversold-bounce: rsi dipped ${dipRsi.toFixed(0)}, now ${rNow.toFixed(0)} & turning up`,
        price: c, rsi: rNow, target: +target.toFixed(6), stop: +stop.toFixed(6), stopPct: +((c - stop) / c).toFixed(4), ema: +ema[i].toFixed(6) };
    }
    return { action: 'HOLD', reason: `oversold (${dipRsi.toFixed(0)}) but no bounce yet`, price: c, rsi: rNow };
  }
  if (k.enableShort && spikeRsi >= k.overboughtRsi) {
    const turningDown = rNow < rPrev, closedWeak = c < bar.h - 0.25 * range, redTick = c <= close[i - 1];
    if (turningDown && closedWeak && redTick) {
      const swingHigh = Math.max(...bars.slice(Math.max(0, i - k.swingN + 1), i + 1).map(b => b.h));
      const target = Math.max(Math.min(ema[i], c * (1 - k.minTpPct)), c * (1 - k.tpCapPct));
      const stop = Math.max(c * (1 + k.stopPct), swingHigh * 1.001);
      return { action: 'SHORT', side: 'short', simOnly: true, reason: `overbought-fade[sim]: rsi spiked ${spikeRsi.toFixed(0)}, now ${rNow.toFixed(0)} & turning down`,
        price: c, rsi: rNow, target: +target.toFixed(6), stop: +stop.toFixed(6), stopPct: +((stop - c) / c).toFixed(4), ema: +ema[i].toFixed(6) };
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
function reconcileHeld(held, bars) {
  let peak = held.entryPx, trough = held.entryPx, heldBars = 0;
  for (const b of bars) if (held.openedBarTime && b.t > held.openedBarTime) { heldBars++; if (b.h > peak) peak = b.h; if (b.l < trough) trough = b.l; }
  return { ...held, peakSince: peak, troughSince: trough, heldBars };
}

// ---- CLI ----
const [cmd, ...args] = process.argv.slice(2);
const k = loadParams();
const BASKET = 'BTCUSDT,ETHUSDT,SOLUSDT,AVAXUSDT,LINKUSDT,LTCUSDT,BCHUSDT,DOGEUSDT,DOTUSDT,XRPUSDT,AAVEUSDT,UNIUSDT';

if (cmd === 'scan') {
  const symbols = (args[0] || BASKET).split(',').map(normSym);
  console.log(`=== mean-reversion scan (Binance, tf=${k.tf}m, long<${k.entryRsi} / short>${k.overboughtRsi}${k.enableShort ? ' [sim]' : ' OFF'}) ===`);
  for (const sym of symbols) {
    const bars = resample(await fetchBars(sym, { start: daysAgoISO(20) }), k.tf);
    const sig = signal(bars, { long: false }, k);
    const tag = !fresh(bars, k.staleMin) ? '(stale data)'
      : sig.action === 'BUY' ? `*** BUY long  tgt ${sig.target} stop ${sig.stop}`
      : sig.action === 'SHORT' ? `*** SHORT[sim]  tgt ${sig.target} stop ${sig.stop}`
      : sig.reason;
    console.log(`${sym.padEnd(9)} @ ${String(sig.price ?? '-').padStart(11)}  rsi ${String(sig.rsi?.toFixed(1) ?? '-').padStart(5)}  -> ${tag}`);
  }
}

else if (cmd === 'decide') {
  const sym = normSym(args[0] || 'BTCUSDT');
  const bars = resample(await fetchBars(sym, { start: daysAgoISO(20) }), k.tf);
  const pos = loadPositions()[sym] || { long: false };
  const sig = signal(bars, (pos.long || pos.short) ? reconcileHeld(pos, bars) : pos, k);
  console.log(JSON.stringify({ symbol: sym, tf: k.tf, bars: bars.length, fresh: fresh(bars, k.staleMin),
    lastBarTime: bars[bars.length - 1]?.t, position: pos, signal: sig }, null, 2));
}

else if (cmd === 'tick') {
  const symbols = (args[0] || BASKET).split(',').map(normSym);
  const equity = +(args[1] || 100000);
  const brief = args.includes('brief');
  const positions = loadPositions();
  const plan = [];
  for (const sym of symbols) {
    const bars = resample(await fetchBars(sym, { start: daysAgoISO(20) }), k.tf);
    const last = bars[bars.length - 1];
    if (!fresh(bars, k.staleMin)) { plan.push({ sym, holding: false, action: 'HOLD', reason: 'stale data', price: last?.c, order: null }); continue; }
    const held = positions[sym] && (positions[sym].long || positions[sym].short) ? positions[sym] : null;
    if (held) {
      const hp = reconcileHeld(held, bars);
      positions[sym] = { ...held, peak: hp.peakSince, trough: hp.troughSince, heldBars: hp.heldBars };
      const sig = signal(bars, hp, k);
      const closing = sig.action === 'SELL' || sig.action === 'COVER';
      const simShort = held.short;
      plan.push({ sym, holding: true, side: held.long ? 'long' : 'short', simOnly: !!simShort, action: sig.action, reason: sig.reason, price: last.c,
        gainPct: sig.gainPct != null ? +(sig.gainPct * 100).toFixed(2) : null, entryPx: held.entryPx, qty: held.qty,
        execute: closing ? (simShort ? `node run.mjs closed "${sym}" <px>  # SIM cover` : `node ../../cli/exec.mjs sell "${sym}" --qty ${held.qty} then: node run.mjs closed "${sym}" <fillPx>`) : null });
    } else {
      const sig = signal(bars, { long: false }, k);
      let order = null;
      if (sig.action === 'BUY') {
        let quote = equity * k.riskPct / Math.max(sig.stopPct, 0.005);
        const cap = equity * k.maxWeight; if (quote > cap) quote = cap;
        order = { side: 'long', quote: +quote.toFixed(2), qty: +(quote / last.c).toFixed(6), target: sig.target, stop: sig.stop,
          execute: `node ../../cli/exec.mjs buy "${sym}" --quote ${(+quote.toFixed(2))} --limit ${last.c} then: node run.mjs opened "${sym}" long <fillPx> <fillQty>` };
      } else if (sig.action === 'SHORT') {
        let quote = equity * k.riskPct / Math.max(sig.stopPct, 0.005);
        const cap = equity * k.maxWeight; if (quote > cap) quote = cap;
        order = { side: 'short', simOnly: true, quote: +quote.toFixed(2), qty: +(quote / last.c).toFixed(6), target: sig.target, stop: sig.stop,
          execute: `SIM ONLY (spot has no shorting): node run.mjs opened "${sym}" short ${last.c} ${(+(quote / last.c).toFixed(6))}` };
      }
      plan.push({ sym, holding: false, action: sig.action, reason: sig.reason, price: last.c, rsi: sig.rsi != null ? +sig.rsi.toFixed(1) : null, order });
    }
  }
  savePositions(positions);
  const out = { ts: new Date().toISOString(), venue: 'binance-meanrev', tf: k.tf, equity, plan };
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
  if (side === 'short') positions[sym] = { ...base, short: true, simOnly: true, target: sig.target ?? +(fillPx * (1 - k.tpCapPct)).toFixed(6), stop: sig.stop ?? +(fillPx * (1 + k.stopPct)).toFixed(6) };
  else positions[sym] = { ...base, long: true, target: sig.target ?? +(fillPx * (1 + k.tpCapPct)).toFixed(6), stop: sig.stop ?? +(fillPx * (1 - k.stopPct)).toFixed(6) };
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
    const net = gross - k.feeRt;
    const rec = { ts: new Date().toISOString(), sym, side, simOnly: !!p.simOnly, entryPx: p.entryPx, exitPx: fillPx, qty: p.qty, grossPct: +(gross * 100).toFixed(3), netPct: +(net * 100).toFixed(3), win: net > 0 };
    logOutcome(rec); delete positions[sym]; savePositions(positions);
    console.log('closed', side, sym, p.simOnly ? '[sim]' : '', '| net pnl%', rec.netPct, '| recorded');
  }
}

else if (cmd === 'review') {
  if (!existsSync(OUTCOMES)) { console.log('no trades logged yet.'); }
  else {
    const rows = readFileSync(OUTCOMES, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    const n = rows.length, wins = rows.filter(r => r.win).length;
    const avg = rows.reduce((s, r) => s + r.netPct, 0) / (n || 1), sum = rows.reduce((s, r) => s + r.netPct, 0);
    console.log(`=== binance mean-reversion review (${n} closed trades) ===`);
    console.log(`win rate ${(100 * wins / (n || 1)).toFixed(0)}%  |  avg net ${avg.toFixed(3)}%/trade  |  cumulative ${sum.toFixed(2)}%`);
    for (const r of rows.slice(-12)) console.log(`  ${r.ts.slice(0, 16)}  ${(r.side || 'long').padEnd(5)}${r.simOnly ? '[sim]' : '    '} ${r.sym.padEnd(9)}  ${r.entryPx} -> ${r.exitPx}  net ${r.netPct >= 0 ? '+' : ''}${r.netPct}%`);
  }
}

else if (cmd === 'status') {
  console.log(JSON.stringify({ params: k, positions: loadPositions() }, null, 2));
}

else {
  console.log('commands: scan | decide | tick | opened | closed | review | status');
}
