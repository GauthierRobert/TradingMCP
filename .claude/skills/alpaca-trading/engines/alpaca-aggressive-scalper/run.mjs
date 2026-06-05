// CLI for alpaca-aggressive-scalper. Fetches public Alpaca 1Min crypto bars (no auth)
// and drives the self-learning AGGRESSIVE scalper. FAST: one small fetch, simple math.
//
//   node run.mjs tick    "BTC/USD,ETH/USD" 100000   # ONE call/tick -> ready-to-execute plan per pair
//   node run.mjs decide  "BTC/USD" [long entryPx peakSince heldBars atrPctEntry]
//   node run.mjs scan    "BTC/USD,ETH/USD,SOL/USD"  # any BUY setups now? (best trading arm)
//   node run.mjs learn   "BTC/USD" 14               # score arms on real 1Min bars + self-modify
//   node run.mjs size    "BTC/USD" 100000           # ATR-risk notional (active arm's stop)
//   node run.mjs opened  "ETH/USD" 1860 0.5 A1 0.0012   # record a BUY fill (px qty arm atrPctEntry)
//   node run.mjs closed  "ETH/USD" 1875 take-profit     # record a SELL fill (px [exitReason])
//   node run.mjs arms | status
import { liveSignal, learnAndEvolve, selectActiveArm, selectTradingArm, loadState, saveState, logDecision,
  recordOutcome, readRealOutcomes, getArm, roundTripMaker, roundTripStop, feeFloor, loadPositions, savePositions } from './engine.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const TICKS_FILE = join(dirname(fileURLToPath(import.meta.url)), '_state', 'loop_ticks.txt');

const DATA = 'https://data.alpaca.markets/v1beta3/crypto/us';
async function fetchBars(symbol, timeframe = '1Min', { limit = 30000, start, end } = {}) {
  const all = []; let pageToken = null;
  do {
    const u = new URL(`${DATA}/bars`);
    u.searchParams.set('symbols', symbol); u.searchParams.set('timeframe', timeframe);
    u.searchParams.set('limit', '10000');
    if (start) u.searchParams.set('start', start);
    if (end) u.searchParams.set('end', end);
    if (pageToken) u.searchParams.set('page_token', pageToken);
    let r, tries = 0;
    do { r = await fetch(u); if (r.status === 429) { await new Promise(res => setTimeout(res, 1500 * ++tries)); continue; } break; } while (tries < 5);
    if (!r.ok) throw new Error(`${symbol} ${r.status} ${await r.text()}`);
    const j = await r.json();
    all.push(...((j.bars && j.bars[symbol]) || []));
    pageToken = j.next_page_token;
  } while (pageToken && all.length < limit);
  return all.map(b => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v, t: b.t }));
}
// Order-book imbalance from the public quote feed (top-of-book): bid share of (bid+ask) size.
// > 0.5 = more resting size on the bid = buy pressure. Returns undefined if unavailable.
async function fetchObi(symbol) {
  try {
    const u = new URL(`${DATA}/latest/quotes`); u.searchParams.set('symbols', symbol);
    const r = await fetch(u); if (!r.ok) return undefined;
    const j = await r.json(); const q = j.quotes && j.quotes[symbol];
    if (!q) return undefined;
    const bs = q.bs ?? 0, as = q.as ?? 0;            // bid size, ask size (top-of-book, noisy)
    if (bs <= 0 || as <= 0) return undefined;        // one side missing -> unusable, treat neutral
    const share = bs / (bs + as);
    if (share < 0.02 || share > 0.98) return undefined;  // degenerate snapshot -> neutral, don't veto
    return share;
  } catch { return undefined; }
}
const daysAgoISO = (d) => new Date(Date.now() - d * 864e5).toISOString();
const pct = (x) => (x * 100).toFixed(2) + '%';

const [cmd, ...args] = process.argv.slice(2);
const NEEDS_STATE = ['decide', 'scan', 'learn', 'arms', 'status', 'size', 'tick', 'opened', 'closed'];
const state = NEEDS_STATE.includes(cmd) ? loadState() : null;

if (cmd === 'decide') {
  const sym = args[0] || 'BTC/USD';
  const position = { long: args[1] === 'long', entryPx: +(args[2] || 0), peakSince: +(args[3] || 0), heldBars: +(args[4] || 0), atrPctEntry: +(args[5] || 0) || undefined };
  const [candles, obi] = await Promise.all([fetchBars(sym, '1Min', { start: daysAgoISO(3) }), fetchObi(sym)]);
  const armId = selectActiveArm(state); const arm = getArm(state, armId);
  const sig = liveSignal(candles, position, arm.knobs, state.config, obi);
  let buyVotes = 0; for (const a of state.arms) { const s = liveSignal(candles, { long: false }, a.knobs, state.config, obi); if (s.action === 'BUY') buyVotes++; }
  const out = { symbol: sym, timeframe: '1Min', bars: candles.length, lastBarTime: candles[candles.length - 1]?.t,
    activeArm: armId, obi: obi !== undefined ? +obi.toFixed(3) : 'n/a', position, signal: sig,
    buyConsensus: `${buyVotes}/${state.arms.length} arms`,
    feeFloorPct: +(feeFloor(state.config) * 100).toFixed(3), makerRoundTripPct: +(roundTripMaker(state.config) * 100).toFixed(3), stopRoundTripPct: +(roundTripStop(state.config) * 100).toFixed(3) };
  logDecision({ sym, armId, action: sig.action, reason: sig.reason, price: sig.price, buyVotes, obi });
  console.log(JSON.stringify(out, null, 2));
}

if (cmd === 'scan') {
  const symbols = (args[0] || 'BTC/USD,ETH/USD,SOL/USD,AVAX/USD,LINK/USD,LTC/USD,BCH/USD,DOGE/USD,DOT/USD,XRP/USD,AAVE/USD,UNI/USD').split(',');
  const armId = selectTradingArm(state); const arm = getArm(state, armId);
  const live = selectActiveArm(state);
  console.log(`=== 1Min AGGRESSIVE BUY scan — best trading arm ${armId} (live posture: ${live}${live === 'A0' ? ' = FLAT' : ''}) ===`);
  for (const sym of symbols) {
    const [candles, obi] = await Promise.all([fetchBars(sym, '1Min', { start: daysAgoISO(3) }), fetchObi(sym)]);
    const sig = liveSignal(candles, { long: false }, arm.knobs, state.config, obi);
    const tag = sig.action === 'BUY' ? `*** BUY  tgt ${sig.target} stop ${sig.stop} (tp ${sig.tpPct}%)` : `${sig.action} (${sig.reason})`;
    console.log(`${sym.padEnd(9)} @ ${String(sig.price).padStart(10)}  atr% ${String(sig.atrPct ?? '-').padStart(5)}  rsi ${String(sig.rsi ?? '-').padStart(5)}  obi ${obi !== undefined ? obi.toFixed(2) : ' n/a'}  -> ${tag}`);
  }
}

if (cmd === 'learn') {
  const sym = args[0] || 'BTC/USD';
  const days = +(args[1] || 14);
  const candles = await fetchBars(sym, '1Min', { start: daysAgoISO(days) });
  const real = readRealOutcomes();
  const res = learnAndEvolve(state, candles, real);
  state.meta.lastLearn = new Date().toISOString();
  saveState(state);
  console.log(`=== learn ${sym} ${days}d (${candles.length} 1Min bars, ${real.length} real fills folded in) ===`);
  console.log(`leader ${res.leader} | active arm -> ${res.active}`);
  console.log(res.changes.length ? 'changes:\n  ' + res.changes.join('\n  ') : 'no structural change this pass');
  console.log('\narm                  ewMean    trades  win%   sumPnl%');
  for (const a of [...state.arms].sort((x, y) => y.stats.ewMean - x.stats.ewMean)) {
    const s = a.stats, isFlat = a.knobs.flat;
    const wr = isFlat ? 'flat' : (s.trades ? (100 * s.wins / s.trades).toFixed(0) : '-');
    const trd = isFlat ? '-' : String(s.trades);
    const sp = isFlat ? '0.00' : (s.sumPnl * 100).toFixed(2);
    const mark = a.id === state.activeArm ? '*' : ' ';
    console.log(`${mark}${a.id.padEnd(4)} ${(a.note || '').slice(0, 24).padEnd(24)} ${s.ewMean.toFixed(4).padStart(8)}  ${trd.padStart(5)}  ${String(wr).padStart(4)}  ${sp.padStart(7)}`);
  }
}

if (cmd === 'arms') {
  console.log(`active: ${state.activeArm} | maxArms ${state.config.maxArms} | fee floor ${pct(feeFloor(state.config))} | maker round-trip ${pct(roundTripMaker(state.config))} | stop round-trip ${pct(roundTripStop(state.config))}`);
  for (const a of state.arms) {
    const s = a.stats, mark = a.id === state.activeArm ? '*' : ' ';
    console.log(`${mark}${a.id}  ${a.note || ''}`);
    console.log(`    ${JSON.stringify(a.knobs)}`);
    console.log(`    ewMean ${s.ewMean.toFixed(4)}  trades ${s.trades}  w/l ${s.wins}/${s.losses}  sumPnl ${(s.sumPnl * 100).toFixed(2)}%${a.parent ? `  (born from ${a.parent})` : ''}`);
  }
}

if (cmd === 'status') {
  console.log(JSON.stringify({ meta: state.meta, activeArm: state.activeArm, config: state.config,
    armCount: state.arms.length, recentChangelog: state.changelog.slice(0, 5) }, null, 2));
}

if (cmd === 'size') {
  const sym = args[0] || 'BTC/USD';
  const equity = +(args[1] || 100000);
  const arm = getArm(state, selectTradingArm(state));
  const [candles, obi] = await Promise.all([fetchBars(sym, '1Min', { start: daysAgoISO(2) }), fetchObi(sym)]);
  const sig = liveSignal(candles, { long: false }, arm.knobs, state.config, obi);
  const price = candles[candles.length - 1].c;
  const stopPct = (sig.stopPct ? sig.stopPct / 100 : arm.knobs.stopAtrMult * 0.002);  // ATR-derived stop fraction
  const riskDollars = equity * state.config.riskPct;
  let notional = riskDollars / stopPct;
  const cap = equity * state.config.maxWeight;
  const capped = notional > cap; if (capped) notional = cap;
  console.log(JSON.stringify({ symbol: sym, equity, price, arm: arm.id, stopPct: +stopPct.toFixed(4),
    riskPct: state.config.riskPct, riskDollars: +riskDollars.toFixed(2),
    notional: +notional.toFixed(2), weight: +(notional / equity).toFixed(3), capped,
    qty: +(notional / price).toFixed(6) }, null, 2));
}

// ---------- AUTOPILOT: one cheap call per 1-min tick -> a ready-to-execute plan ----------
if (cmd === 'tick') {
  const symbols = (args[0] || 'BTC/USD,ETH/USD,SOL/USD,AVAX/USD,LINK/USD,LTC/USD,BCH/USD,DOGE/USD,DOT/USD,XRP/USD,AAVE/USD,UNI/USD').split(',');
  const equity = +(args[1] || 100000);
  const positions = loadPositions();
  const activeId = selectActiveArm(state);
  const plan = [];
  for (const sym of symbols) {
    const [candles, obi] = await Promise.all([fetchBars(sym, '1Min', { start: daysAgoISO(3) }), fetchObi(sym)]);
    const last = candles[candles.length - 1];
    const held = positions[sym] && positions[sym].long ? positions[sym] : null;
    if (held) {
      let peak = held.entryPx, heldBars = 0;
      for (const c of candles) if (held.openedBarTime && c.t > held.openedBarTime) { heldBars++; if (c.h > peak) peak = c.h; }
      const arm = getArm(state, held.armId) || getArm(state, activeId);
      const sig = liveSignal(candles, { long: true, entryPx: held.entryPx, peakSince: peak, heldBars, atrPctEntry: held.atrPctEntry }, arm.knobs, state.config, obi);
      held.peak = peak; held.heldBars = heldBars; positions[sym] = held;
      plan.push({ sym, holding: true, arm: arm.id, action: sig.action, reason: sig.reason, price: last.c,
        gainPct: sig.gainPct, entryPx: held.entryPx, qty: held.qty, exitVia: sig.exitVia,
        execute: sig.action === 'SELL'
          ? `close_position("${sym}") then: node run.mjs closed "${sym}" <fillPx> ${sig.reason}`
          : null });
    } else {
      const arm = getArm(state, activeId);
      const sig = liveSignal(candles, { long: false }, arm.knobs, state.config, obi);
      let order = null;
      if (sig.action === 'BUY') {
        const stopPct = sig.stopPct ? sig.stopPct / 100 : 0.006;
        let notional = equity * state.config.riskPct / stopPct;
        const cap = equity * state.config.maxWeight; if (notional > cap) notional = cap;
        order = { notional: +notional.toFixed(2), qty: +(notional / last.c).toFixed(6), target: sig.target, stop: sig.stop,
          tpPct: sig.tpPct, atrPctEntry: sig.atrPctEntry,
          // MAKER-FIRST: post a buy LIMIT at/just below last to qualify for the 0.15% maker fee.
          execute: `place_crypto_order("${sym}","buy",notional=${(+notional.toFixed(2))},type="limit",limit_price=${last.c},time_in_force="gtc") then on fill: node run.mjs opened "${sym}" <fillPx> <fillQty> ${arm.id} ${sig.atrPctEntry}` };
      }
      plan.push({ sym, holding: false, arm: arm.id, action: sig.action, reason: sig.reason, price: last.c, obi: obi !== undefined ? +obi.toFixed(3) : null, order });
    }
  }
  savePositions(positions);
  const lastLearn = state.meta.lastLearn ? Date.parse(state.meta.lastLearn) : 0;
  const learnDue = (Date.now() - lastLearn) > 55 * 60 * 1000;
  let ticks = 0; try { ticks = parseInt(readFileSync(TICKS_FILE, 'utf8').trim(), 10) || 0; } catch {}
  ticks++; try { writeFileSync(TICKS_FILE, String(ticks)); } catch {}
  const clearDue = ticks % 20 === 0;   // every 20 ticks (~20 min at 1m loop) -> reset Claude's context
  console.log(JSON.stringify({ ts: new Date().toISOString(), equity, activeArm: activeId, ticks, clearDue,
    learnDue, learnHint: learnDue ? `node run.mjs learn "${symbols[0]}" 14` : null, plan }, null, 2));
}

if (cmd === 'opened') {
  const [sym, fillPx, fillQty, armId, atrPctEntry] = args;
  const positions = loadPositions();
  const candles = await fetchBars(sym, '1Min', { start: daysAgoISO(1) });
  positions[sym] = { long: true, entryPx: +fillPx, qty: +fillQty, peak: +fillPx,
    openedAt: new Date().toISOString(), openedBarTime: candles[candles.length - 1]?.t, heldBars: 0,
    atrPctEntry: +atrPctEntry || undefined, armId: armId || selectActiveArm(state) };
  savePositions(positions);
  console.log('opened', sym, JSON.stringify(positions[sym]));
}

if (cmd === 'closed') {
  const [sym, fillPx, exitReason] = args;
  const positions = loadPositions();
  const p = positions[sym];
  if (!p) { console.log('no open position tracked for', sym); }
  else {
    const line = recordOutcome({ sym, side: 'sell', entryPx: p.entryPx, exitPx: +fillPx, qty: p.qty, armId: p.armId,
      exitReason: exitReason || 'taker', source: 'real', cfg: state.config });
    delete positions[sym]; savePositions(positions);
    console.log('closed', sym, '| net pnl%', line.pnlPct, '| armId', p.armId, '| via', exitReason || 'taker', '(recorded for learning)');
  }
}

if (!cmd) {
  console.log('commands: decide | scan | learn | size | arms | status | tick | opened | closed');
}

export { fetchBars, fetchObi };
