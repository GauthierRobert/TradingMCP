// CLI for alpaca-equity-scalper. Fetches Alpaca IEX 1Min stock/ETF bars (AUTH required)
// and drives the self-learning scalper. FAST: one small fetch, simple math.
//
//   node run.mjs decide  "SPY" [long entryPx peakSince heldBars]   # live signal (active arm)
//   node run.mjs scan    "SPY,QQQ,GLD"                             # quick multi-symbol BUY scan
//   node run.mjs learn   "SPY" 14                                  # score arms on real 1Min bars + self-modify
//   node run.mjs arms                                              # show the arm grid + bandit stats
//   node run.mjs status                                           # active arm, config, recent changelog
//   node run.mjs size    "SPY" 100000                              # risk-based notional off active arm's stop
//   node run.mjs record  "SPY" buy 600 606 10 A1                   # log a closed (sim/real) trade
//   node run.mjs tick    "SPY,QQQ,GLD" [equity]                    # autopilot: a ready-to-execute plan per symbol
//   node run.mjs opened  "GLD" 410.9 5 A1                          # record an executed BUY fill (px qty arm)
//   node run.mjs closed  "GLD" 413.2                               # record an executed SELL fill -> logs net pnl
//
// Auth: reads ALPACA_API_KEY / ALPACA_SECRET_KEY from the environment (Windows user env vars).
// Data feed: IEX (free tier). Liquid names/ETFs only — IEX is a partial-volume view.
import { liveSignal, learnAndEvolve, selectActiveArm, selectTradingArm, loadState, saveState, logDecision,
  recordOutcome, readRealOutcomes, getArm, roundTripCost, feeFloor, loadPositions, savePositions } from './scalper.mjs';
import { charterGate } from '../alpaca-charter/charter.mjs';

// ---- Alpaca stock market data (v2 bars, IEX feed). API key REQUIRED. ----
const KEY = process.env.ALPACA_API_KEY, SEC = process.env.ALPACA_SECRET_KEY;
const DATA = 'https://data.alpaca.markets/v2/stocks';
const FEED = 'iex';
const BAR_AGE_OPEN_MS = 20 * 60 * 1000;   // last bar fresher than 20m => market is actively trading
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const normSym = (s) => String(s || 'SPY').toUpperCase().replace(/[^A-Z.]/g, '');
function authHeaders() {
  if (!KEY || !SEC) throw new Error('ALPACA_API_KEY / ALPACA_SECRET_KEY not in environment — stock data needs auth. Start from a session that inherited the Windows user env vars.');
  return { 'APCA-API-KEY-ID': KEY, 'APCA-API-SECRET-KEY': SEC };
}
// Returns [{o,h,l,c,v,t}] (t = ISO string, engine-compatible). Paginates if needed.
async function fetchBars(symbol, _tf = '1Min', { limit = 10000, start, end } = {}) {
  const sym = normSym(symbol);
  const all = []; let pageToken = null;
  do {
    const u = new URL(`${DATA}/bars`);
    u.searchParams.set('symbols', sym); u.searchParams.set('timeframe', '1Min');
    u.searchParams.set('feed', FEED); u.searchParams.set('limit', '10000');
    if (start) u.searchParams.set('start', start);
    if (end) u.searchParams.set('end', end);
    if (pageToken) u.searchParams.set('page_token', pageToken);
    let r, tries = 0;
    do { r = await fetch(u, { headers: authHeaders() }); if (r.status === 429) { await sleep(1500 * ++tries); continue; } break; } while (tries < 5);
    if (!r.ok) throw new Error(`${sym} ${r.status} ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    const bars = (j.bars && j.bars[sym]) || [];
    all.push(...bars.map(b => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v, t: b.t })));
    pageToken = j.next_page_token;
  } while (pageToken && all.length < limit);
  return all;
}
// Market-open inferred from data freshness (no timezone/DST/holiday logic needed).
function marketOpenFromBars(candles) {
  const last = candles[candles.length - 1];
  if (!last) return false;
  return (Date.now() - Date.parse(last.t)) < BAR_AGE_OPEN_MS;
}
const daysAgoISO = (d) => new Date(Date.now() - d * 864e5).toISOString();
const pct = (x) => (x * 100).toFixed(2) + '%';

const [cmd, ...args] = process.argv.slice(2);
const NEEDS_STATE = ['decide', 'scan', 'learn', 'arms', 'status', 'size', 'record', 'tick', 'opened', 'closed'];
const state = NEEDS_STATE.includes(cmd) ? loadState() : null;

if (cmd === 'decide') {
  const sym = normSym(args[0] || 'SPY');
  const position = { long: args[1] === 'long', entryPx: +(args[2] || 0), peakSince: +(args[3] || 0), heldBars: +(args[4] || 0) };
  const candles = await fetchBars(sym, '1Min', { start: daysAgoISO(7) });        // ~7 calendar days of RTH 1Min = plenty for EMA50
  const armId = selectActiveArm(state); const arm = getArm(state, armId);
  const sig = liveSignal(candles, position, arm.knobs, state.config);
  let buyVotes = 0; for (const a of state.arms) { const s = liveSignal(candles, { long: false }, a.knobs, state.config); if (s.action === 'BUY') buyVotes++; }
  const out = { symbol: sym, timeframe: '1Min', feed: FEED, bars: candles.length, lastBarTime: candles[candles.length - 1]?.t,
    marketOpen: marketOpenFromBars(candles), activeArm: armId, position, signal: sig, buyConsensus: `${buyVotes}/${state.arms.length} arms`,
    feeFloorPct: +(feeFloor(state.config) * 100).toFixed(3), roundTripCostPct: +(roundTripCost(state.config) * 100).toFixed(3) };
  logDecision({ sym, armId, action: sig.action, reason: sig.reason, price: sig.price, buyVotes });
  console.log(JSON.stringify(out, null, 2));
}

if (cmd === 'scan') {
  const symbols = (args[0] || 'SPY,QQQ,IWM,GLD,SLV,USO,TLT,AAPL,MSFT,NVDA,AMZN,META').split(',').map(normSym);
  const armId = selectTradingArm(state); const arm = getArm(state, armId);
  const live = selectActiveArm(state);
  console.log(`=== 1Min BUY scan (IEX) — best trading arm ${armId} (live posture: ${live}${live === 'A0' ? ' = FLAT' : ''}) ===`);
  for (const sym of symbols) {
    const candles = await fetchBars(sym, '1Min', { start: daysAgoISO(7) });
    const open = marketOpenFromBars(candles);
    const sig = liveSignal(candles, { long: false }, arm.knobs, state.config);
    const tag = !open ? `(market closed — last bar ${candles[candles.length - 1]?.t})` : (sig.action === 'BUY' ? `*** BUY  tgt ${sig.target} stop ${sig.stop}` : `${sig.action} (${sig.reason})`);
    console.log(`${sym.padEnd(6)} @ ${String(sig.price).padStart(10)}  rsi ${String(sig.rsi ?? '-').padStart(5)}  -> ${tag}`);
  }
}

if (cmd === 'learn') {
  const sym = normSym(args[0] || 'SPY');
  const days = +(args[1] || 14);
  const candles = await fetchBars(sym, '1Min', { start: daysAgoISO(days) });
  const real = readRealOutcomes();
  const res = learnAndEvolve(state, candles, real);
  state.meta.lastLearn = new Date().toISOString();
  saveState(state);
  console.log(`=== learn ${sym} ${days}d (${candles.length} 1Min IEX bars, ${real.length} real fills folded in) ===`);
  console.log(`leader ${res.leader} | active arm -> ${res.active}`);
  console.log(res.changes.length ? 'changes:\n  ' + res.changes.join('\n  ') : 'no structural change this pass');
  console.log('\narm                ewMean    trades  win%   sumPnl%');
  for (const a of [...state.arms].sort((x, y) => y.stats.ewMean - x.stats.ewMean)) {
    const s = a.stats, isFlat = a.knobs.flat;
    const wr = isFlat ? 'flat' : (s.trades ? (100 * s.wins / s.trades).toFixed(0) : '-');
    const trd = isFlat ? '-' : String(s.trades);
    const sp = isFlat ? '0.00' : (s.sumPnl * 100).toFixed(2);
    const mark = a.id === state.activeArm ? '*' : ' ';
    console.log(`${mark}${a.id.padEnd(4)} ${(a.note || '').slice(0, 22).padEnd(22)} ${s.ewMean.toFixed(4).padStart(8)}  ${trd.padStart(5)}  ${String(wr).padStart(4)}  ${sp.padStart(7)}`);
  }
}

if (cmd === 'arms') {
  console.log(`active: ${state.activeArm} | maxArms ${state.config.maxArms} | cost floor ${pct(feeFloor(state.config))} (round-trip ${pct(roundTripCost(state.config))}, commission-free)`);
  for (const a of state.arms) {
    const s = a.stats, mark = a.id === state.activeArm ? '*' : ' ';
    console.log(`${mark}${a.id}  ${JSON.stringify(a.knobs)}`);
    console.log(`    ewMean ${s.ewMean.toFixed(4)}  trades ${s.trades}  w/l ${s.wins}/${s.losses}  sumPnl ${(s.sumPnl * 100).toFixed(2)}%${a.parent ? `  (born from ${a.parent})` : ''}`);
  }
}

if (cmd === 'status') {
  console.log(JSON.stringify({ meta: state.meta, activeArm: state.activeArm, config: state.config,
    armCount: state.arms.length, recentChangelog: state.changelog.slice(0, 5) }, null, 2));
}

if (cmd === 'size') {
  const sym = normSym(args[0] || 'SPY');
  const equity = +(args[1] || 100000);
  const arm = getArm(state, selectTradingArm(state));
  const candles = await fetchBars(sym, '1Min', { start: daysAgoISO(2) });
  const price = candles[candles.length - 1].c;
  const stopPct = arm.knobs.stopPct;
  const riskDollars = equity * state.config.riskPct;
  let notional = riskDollars / stopPct;
  const cap = equity * state.config.maxWeight;
  const capped = notional > cap; if (capped) notional = cap;
  console.log(JSON.stringify({ symbol: sym, equity, price, arm: arm.id, stopPct,
    riskPct: state.config.riskPct, riskDollars: +riskDollars.toFixed(2),
    notional: +notional.toFixed(2), weight: +(notional / equity).toFixed(3), capped,
    qty: +(notional / price).toFixed(4) }, null, 2));
}

if (cmd === 'record') {
  const [symRaw, side, entryPx, exitPx, qty, armId, source] = args;
  const sym = normSym(symRaw);
  const line = recordOutcome({ sym, side, entryPx: +entryPx, exitPx: +exitPx, qty: +qty,
    armId: armId || state.activeArm, source: source || 'real', cfg: state.config });
  console.log('recorded:', JSON.stringify(line));
  console.log('note: run `node run.mjs learn` to fold this into the bandit.');
}

// ---------- AUTOPILOT: one cheap call per 1-min tick -> a ready-to-execute plan ----------
if (cmd === 'tick') {
  // tick "SPY,QQQ,GLD" [equity]  -> JSON plan; Claude executes the orders via the Alpaca MCP (equity order tool).
  const symbols = (args[0] || 'SPY,QQQ,IWM,GLD,SLV,USO,TLT,AAPL,MSFT,NVDA,AMZN,META').split(',').map(normSym);
  const equity = +(args[1] || 100000);
  const positions = loadPositions();
  const activeId = selectActiveArm(state);
  const plan = [];
  let anyOpen = false;
  for (const sym of symbols) {
    const candles = await fetchBars(sym, '1Min', { start: daysAgoISO(7) });
    const last = candles[candles.length - 1];
    const open = marketOpenFromBars(candles); if (open) anyOpen = true;
    const held = positions[sym] && positions[sym].long ? positions[sym] : null;
    if (!open) {
      // Market closed / stale data -> never act; just report. (Existing positions are held flat until RTH.)
      plan.push({ sym, holding: !!held, arm: held?.armId || activeId, action: 'HOLD', reason: 'market closed / stale data — no action', price: last?.c, marketOpen: false, order: null });
      continue;
    }
    if (held) {
      let peak = held.entryPx, heldBars = 0;
      for (const c of candles) if (held.openedBarTime && c.t > held.openedBarTime) { heldBars++; if (c.h > peak) peak = c.h; }
      const arm = getArm(state, held.armId) || getArm(state, activeId);
      const sig = liveSignal(candles, { long: true, entryPx: held.entryPx, peakSince: peak, heldBars }, arm.knobs, state.config);
      held.peak = peak; held.heldBars = heldBars;
      plan.push({ sym, holding: true, arm: arm.id, action: sig.action, reason: sig.reason, price: last.c, marketOpen: true,
        gainPct: sig.gainPct, entryPx: held.entryPx, qty: held.qty,
        execute: sig.action === 'SELL' ? `close_position("${sym}") then: node run.mjs closed "${sym}" <fillPx>` : null });
    } else {
      const arm = getArm(state, activeId);
      const sig = liveSignal(candles, { long: false }, arm.knobs, state.config);
      let order = null, gate = null;
      if (sig.action === 'BUY') {
        // CHARTER GATE: a 1Min BUY only fires if the 5Min STRUCTURE is long-friendly (lazy: only
        // consulted when a BUY triggers; exits are never gated; fail-closed on charter errors).
        gate = await charterGate(sym);
        if (!gate.allowLong) {
          plan.push({ sym, holding: false, arm: arm.id, action: 'HOLD',
            reason: `charter-gate blocked BUY (${sig.reason}) — ${gate.reason}`, price: last.c, marketOpen: true, order: null, charterGate: gate });
          continue;
        }
        const stopPct = arm.knobs.stopPct ?? 0.005;
        let notional = equity * state.config.riskPct / stopPct;
        const cap = equity * state.config.maxWeight; if (notional > cap) notional = cap;
        order = { notional: +notional.toFixed(2), qty: +(notional / last.c).toFixed(4), target: sig.target, stop: sig.stop,
          execute: `place_stock_order("${sym}","buy",notional=${(+notional.toFixed(2))},type="limit",limit_price=${last.c},time_in_force="day") then: node run.mjs opened "${sym}" <fillPx> <fillQty> ${arm.id}` };
      }
      plan.push({ sym, holding: false, arm: arm.id, action: sig.action, reason: sig.reason, price: last.c, marketOpen: true, order, ...(gate ? { charterGate: gate } : {}) });
    }
  }
  savePositions(positions);
  const lastLearn = state.meta.lastLearn ? Date.parse(state.meta.lastLearn) : 0;
  const learnDue = anyOpen && (Date.now() - lastLearn) > 55 * 60 * 1000;   // only re-learn during market hours
  const brief = args.includes('brief');   // compact output for in-session loops: only actionable items
  const out = { ts: new Date().toISOString(), venue: 'alpaca-equity', feed: FEED, marketOpen: anyOpen, equity, activeArm: activeId,
    learnDue, learnHint: learnDue ? `node run.mjs learn "${symbols[0]}" 14` : null, plan };
  if (brief) {
    out.scanned = plan.length;
    out.held = plan.filter(p => p.holding).map(p => p.entryPx ? `${p.sym}@${p.entryPx}` : p.sym);
    out.plan = plan.filter(p => p.action !== 'HOLD');
  }
  console.log(JSON.stringify(out, null, brief ? 0 : 2));
}

if (cmd === 'opened') {
  const [symRaw, fillPx, fillQty, armId] = args;
  const sym = normSym(symRaw);
  const positions = loadPositions();
  const candles = await fetchBars(sym, '1Min', { start: daysAgoISO(2) });
  positions[sym] = { long: true, entryPx: +fillPx, qty: +fillQty, peak: +fillPx,
    openedAt: new Date().toISOString(), openedBarTime: candles[candles.length - 1]?.t, heldBars: 0,
    armId: armId || selectActiveArm(state) };
  savePositions(positions);
  console.log('opened', sym, JSON.stringify(positions[sym]));
}

if (cmd === 'closed') {
  const [symRaw, fillPx] = args;
  const sym = normSym(symRaw);
  const positions = loadPositions();
  const p = positions[sym];
  if (!p) { console.log('no open position tracked for', sym); }
  else {
    const line = recordOutcome({ sym, side: 'sell', entryPx: p.entryPx, exitPx: +fillPx, qty: p.qty, armId: p.armId, source: 'real', cfg: state.config });
    delete positions[sym]; savePositions(positions);
    console.log('closed', sym, '| net pnl%', line.pnlPct, '| armId', p.armId, '(recorded for learning)');
  }
}

if (!cmd) {
  console.log('commands: decide | scan | learn | size | record | arms | status | tick | opened | closed');
}

export { fetchBars };
