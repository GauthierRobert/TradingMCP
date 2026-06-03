// CLI for alpaca-adaptive-scalper. Fetches public Alpaca 5Min crypto bars (no auth)
// and drives the self-learning scalper. FAST: one small fetch, simple math.
//
//   node run.mjs decide  "BTC/USD" [long entryPx peakSince heldBars]   # live signal (active arm)
//   node run.mjs scan    "BTC/USD,ETH/USD"                             # quick multi-pair BUY scan
//   node run.mjs learn   "BTC/USD" 14                                  # score arms on real 5Min bars + self-modify
//   node run.mjs arms                                                  # show the arm grid + bandit stats
//   node run.mjs status                                               # active arm, config, recent changelog
//   node run.mjs size    "BTC/USD" 100000                              # risk-based notional off active arm's stop
//   node run.mjs record  "BTC/USD" buy 67000 67900 0.1 A1              # log a closed (paper/real) trade
import { liveSignal, learnAndEvolve, selectActiveArm, selectTradingArm, loadState, saveState, logDecision,
  recordOutcome, readRealOutcomes, getArm, roundTripCost, feeFloor, loadPositions, savePositions } from './scalper.mjs';

const DATA = 'https://data.alpaca.markets/v1beta3/crypto/us';
async function fetchBars(symbol, timeframe = '5Min', { limit = 5000, start, end } = {}) {
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
const daysAgoISO = (d) => new Date(Date.now() - d * 864e5).toISOString();
const pct = (x) => (x * 100).toFixed(2) + '%';

const [cmd, ...args] = process.argv.slice(2);
const NEEDS_STATE = ['decide', 'scan', 'learn', 'arms', 'status', 'size', 'record', 'tick', 'opened', 'closed'];
const state = NEEDS_STATE.includes(cmd) ? loadState() : null;

if (cmd === 'decide') {
  const sym = args[0] || 'BTC/USD';
  const position = { long: args[1] === 'long', entryPx: +(args[2] || 0), peakSince: +(args[3] || 0), heldBars: +(args[4] || 0) };
  const candles = await fetchBars(sym, '5Min', { start: daysAgoISO(3) });          // ~3 days of 5Min = plenty for EMA50
  const armId = selectActiveArm(state); const arm = getArm(state, armId);
  const sig = liveSignal(candles, position, arm.knobs, state.config);
  // light consensus: how many arms agree on a BUY right now (entry conviction)
  let buyVotes = 0; for (const a of state.arms) { const s = liveSignal(candles, { long: false }, a.knobs, state.config); if (s.action === 'BUY') buyVotes++; }
  const out = { symbol: sym, timeframe: '5Min', bars: candles.length, lastBarTime: candles[candles.length - 1]?.t,
    activeArm: armId, position, signal: sig, buyConsensus: `${buyVotes}/${state.arms.length} arms`,
    feeFloorPct: +(feeFloor(state.config) * 100).toFixed(3), roundTripCostPct: +(roundTripCost(state.config) * 100).toFixed(3) };
  logDecision({ sym, armId, action: sig.action, reason: sig.reason, price: sig.price, buyVotes });
  console.log(JSON.stringify(out, null, 2));
}

if (cmd === 'scan') {
  const symbols = (args[0] || 'BTC/USD,ETH/USD,SOL/USD').split(',');
  const armId = selectTradingArm(state); const arm = getArm(state, armId);   // best TRADING arm, even if live posture is FLAT
  const live = selectActiveArm(state);
  console.log(`=== 5Min BUY scan — best trading arm ${armId} (live posture: ${live}${live === 'A0' ? ' = FLAT' : ''}) ===`);
  for (const sym of symbols) {
    const candles = await fetchBars(sym, '5Min', { start: daysAgoISO(3) });
    const sig = liveSignal(candles, { long: false }, arm.knobs, state.config);
    const tag = sig.action === 'BUY' ? `*** BUY  tgt ${sig.target} stop ${sig.stop}` : `${sig.action} (${sig.reason})`;
    console.log(`${sym.padEnd(9)} @ ${String(sig.price).padStart(10)}  rsi ${String(sig.rsi ?? '-').padStart(5)}  -> ${tag}`);
  }
}

if (cmd === 'learn') {
  const sym = args[0] || 'BTC/USD';
  const days = +(args[1] || 14);
  const candles = await fetchBars(sym, '5Min', { start: daysAgoISO(days) });
  const real = readRealOutcomes();
  const res = learnAndEvolve(state, candles, real);
  state.meta.lastLearn = new Date().toISOString();
  saveState(state);
  console.log(`=== learn ${sym} ${days}d (${candles.length} 5Min bars, ${real.length} real fills folded in) ===`);
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
  console.log(`active: ${state.activeArm} | maxArms ${state.config.maxArms} | fee floor ${pct(feeFloor(state.config))} (round-trip cost ${pct(roundTripCost(state.config))})`);
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
  const sym = args[0] || 'BTC/USD';
  const equity = +(args[1] || 100000);
  const arm = getArm(state, selectTradingArm(state));    // size a hypothetical entry off the best trading arm's stop
  const candles = await fetchBars(sym, '5Min', { start: daysAgoISO(1) });
  const price = candles[candles.length - 1].c;
  const stopPct = arm.knobs.stopPct;
  const riskDollars = equity * state.config.riskPct;
  let notional = riskDollars / stopPct;                          // risk a fixed % of equity given the stop distance
  const cap = equity * state.config.maxWeight;
  const capped = notional > cap; if (capped) notional = cap;
  console.log(JSON.stringify({ symbol: sym, equity, price, arm: arm.id, stopPct,
    riskPct: state.config.riskPct, riskDollars: +riskDollars.toFixed(2),
    notional: +notional.toFixed(2), weight: +(notional / equity).toFixed(3), capped,
    qty: +(notional / price).toFixed(6) }, null, 2));
}

if (cmd === 'record') {
  // record SYM side entryPx exitPx qty [armId] [source]
  const [sym, side, entryPx, exitPx, qty, armId, source] = args;
  const line = recordOutcome({ sym, side, entryPx: +entryPx, exitPx: +exitPx, qty: +qty,
    armId: armId || state.activeArm, source: source || 'real', cfg: state.config });
  console.log('recorded:', JSON.stringify(line));
  console.log('note: run `node run.mjs learn` to fold this into the bandit.');
}

// ---------- AUTOPILOT: one cheap call per 5-min tick -> a ready-to-execute plan ----------
if (cmd === 'tick') {
  // tick "BTC/USD,ETH/USD" [equity]  -> JSON plan; Claude executes the orders via the Alpaca MCP.
  const symbols = (args[0] || 'BTC/USD,ETH/USD').split(',');
  const equity = +(args[1] || 100000);
  const positions = loadPositions();
  const activeId = selectActiveArm(state);
  const plan = [];
  for (const sym of symbols) {
    const candles = await fetchBars(sym, '5Min', { start: daysAgoISO(3) });
    const last = candles[candles.length - 1];
    const held = positions[sym] && positions[sym].long ? positions[sym] : null;
    if (held) {
      // recompute peak (highest high since entry) + heldBars from the bar stream
      let peak = held.entryPx, heldBars = 0;
      for (const c of candles) if (held.openedBarTime && c.t > held.openedBarTime) { heldBars++; if (c.h > peak) peak = c.h; }
      const arm = getArm(state, held.armId) || getArm(state, activeId);
      const sig = liveSignal(candles, { long: true, entryPx: held.entryPx, peakSince: peak, heldBars }, arm.knobs, state.config);
      held.peak = peak; held.heldBars = heldBars;
      plan.push({ sym, holding: true, arm: arm.id, action: sig.action, reason: sig.reason, price: last.c,
        gainPct: sig.gainPct, entryPx: held.entryPx, qty: held.qty,
        execute: sig.action === 'SELL' ? `close_position("${sym}") then: node run.mjs closed "${sym}" <fillPx>` : null });
    } else {
      const arm = getArm(state, activeId);
      const sig = liveSignal(candles, { long: false }, arm.knobs, state.config);
      let order = null;
      if (sig.action === 'BUY') {
        const stopPct = arm.knobs.stopPct ?? 0.007;
        let notional = equity * state.config.riskPct / stopPct;
        const cap = equity * state.config.maxWeight; if (notional > cap) notional = cap;
        order = { notional: +notional.toFixed(2), qty: +(notional / last.c).toFixed(6), target: sig.target, stop: sig.stop,
          execute: `place_crypto_order("${sym}","buy",notional=${(+notional.toFixed(2))},type="limit",limit_price=${last.c}) then: node run.mjs opened "${sym}" <fillPx> <fillQty> ${arm.id}` };
      }
      plan.push({ sym, holding: false, arm: arm.id, action: sig.action, reason: sig.reason, price: last.c, order });
    }
  }
  savePositions(positions);
  const lastLearn = state.meta.lastLearn ? Date.parse(state.meta.lastLearn) : 0;
  const learnDue = (Date.now() - lastLearn) > 55 * 60 * 1000;   // run learn ~hourly
  console.log(JSON.stringify({ ts: new Date().toISOString(), equity, activeArm: activeId,
    learnDue, learnHint: learnDue ? `node run.mjs learn "${symbols[0]}" 14` : null, plan }, null, 2));
}

if (cmd === 'opened') {
  // opened SYM fillPx fillQty [armId]  -> record an executed BUY so later ticks can manage the exit.
  const [sym, fillPx, fillQty, armId] = args;
  const positions = loadPositions();
  const candles = await fetchBars(sym, '5Min', { start: daysAgoISO(1) });
  positions[sym] = { long: true, entryPx: +fillPx, qty: +fillQty, peak: +fillPx,
    openedAt: new Date().toISOString(), openedBarTime: candles[candles.length - 1]?.t, heldBars: 0,
    armId: armId || selectActiveArm(state) };
  savePositions(positions);
  console.log('opened', sym, JSON.stringify(positions[sym]));
}

if (cmd === 'closed') {
  // closed SYM fillPx  -> record an executed SELL, log the net-of-fee outcome for learning.
  const [sym, fillPx] = args;
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
