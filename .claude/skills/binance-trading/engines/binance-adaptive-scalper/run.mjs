// CLI for binance-adaptive-scalper. Fetches public Binance 1m klines (no auth)
// and drives the self-learning scalper. FAST: one small fetch, simple math.
//
//   node run.mjs decide  "BTCUSDT" [long entryPx peakSince heldBars]   # live signal (active arm)
//   node run.mjs scan    "BTCUSDT,ETHUSDT"                             # quick multi-pair BUY scan
//   node run.mjs learn   "BTCUSDT" 14                                  # score arms on real 1m bars + self-modify
//   node run.mjs arms                                                  # show the arm grid + bandit stats
//   node run.mjs status                                               # active arm, config, recent changelog
//   node run.mjs size    "BTCUSDT" 100000                              # risk-based notional off active arm's stop
//   node run.mjs record  "BTCUSDT" buy 67000 67900 0.1 A1              # log a closed (sim/real) trade
//   node run.mjs tick    "BTCUSDT,ETHUSDT" [equity]                    # autopilot: a ready-to-execute plan per pair
//   node run.mjs opened  "ETHUSDT" 1860 0.5 A1                         # record an executed BUY fill (px qty arm)
//   node run.mjs closed  "ETHUSDT" 1875                                # record an executed SELL fill -> logs net pnl
import { liveSignal, learnAndEvolve, selectActiveArm, selectTradingArm, loadState, saveState, logDecision,
  recordOutcome, readRealOutcomes, getArm, roundTripCost, feeFloor, loadPositions, savePositions } from './scalper.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const TICKS_FILE = join(dirname(fileURLToPath(import.meta.url)), '_state', 'loop_ticks.txt');

// ---- Binance public market data (klines). No API key needed for market data. ----
// Multiple hosts for geo-resilience; data-api.binance.vision is the public market-data mirror.
const HOSTS = ['https://api.binance.com', 'https://data-api.binance.vision', 'https://api-gcp.binance.com'];
const INTERVAL = '1m';
const BAR_MS = 1 * 60 * 1000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// Normalize a symbol to Binance form: "BTC/USDT" | "btcusdt" | "BTC/USD" -> "BTCUSDT".
function normSym(s) {
  let x = String(s || 'BTCUSDT').toUpperCase().replace(/[\/\-_]/g, '');
  if (x.endsWith('USD') && !x.endsWith('USDT') && !x.endsWith('BUSD') && !x.endsWith('USDC')) x += 'T'; // BTCUSD -> BTCUSDT
  return x;
}
async function klinesPage(symbol, { startTime, endTime, limit = 1000 } = {}) {
  let lastErr;
  for (const host of HOSTS) {
    const u = new URL(`${host}/api/v3/klines`);
    u.searchParams.set('symbol', symbol);
    u.searchParams.set('interval', INTERVAL);
    u.searchParams.set('limit', String(limit));
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
// Returns [{o,h,l,c,v,t}] with t as ISO string (so the engine's lexicographic t-compares work).
async function fetchBars(symbol, _tf = '1m', { limit = 30000, start, end } = {}) {
  const sym = normSym(symbol);
  let startTime = start ? Date.parse(start) : (Date.now() - 3 * 864e5);
  const endTime = end ? Date.parse(end) : Date.now();
  const all = [];
  while (all.length < limit) {
    const page = await klinesPage(sym, { startTime, endTime, limit: 1000 });
    if (!page.length) break;
    for (const k of page) all.push({ o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5], t: new Date(k[0]).toISOString() });
    if (page.length < 1000) break;
    startTime = page[page.length - 1][0] + BAR_MS;
    if (startTime > endTime) break;
  }
  return all;
}
const daysAgoISO = (d) => new Date(Date.now() - d * 864e5).toISOString();
const pct = (x) => (x * 100).toFixed(2) + '%';

const [cmd, ...args] = process.argv.slice(2);
const NEEDS_STATE = ['decide', 'scan', 'learn', 'arms', 'status', 'size', 'record', 'tick', 'opened', 'closed'];
const state = NEEDS_STATE.includes(cmd) ? loadState() : null;

if (cmd === 'decide') {
  const sym = normSym(args[0] || 'BTCUSDT');
  const position = { long: args[1] === 'long', entryPx: +(args[2] || 0), peakSince: +(args[3] || 0), heldBars: +(args[4] || 0) };
  const candles = await fetchBars(sym, '1m', { start: daysAgoISO(3) });          // ~3 days of 1m = plenty for EMA50
  const armId = selectActiveArm(state); const arm = getArm(state, armId);
  const sig = liveSignal(candles, position, arm.knobs, state.config);
  // light consensus: how many arms agree on a BUY right now (entry conviction)
  let buyVotes = 0; for (const a of state.arms) { const s = liveSignal(candles, { long: false }, a.knobs, state.config); if (s.action === 'BUY') buyVotes++; }
  const out = { symbol: sym, timeframe: '1m', bars: candles.length, lastBarTime: candles[candles.length - 1]?.t,
    activeArm: armId, position, signal: sig, buyConsensus: `${buyVotes}/${state.arms.length} arms`,
    feeFloorPct: +(feeFloor(state.config) * 100).toFixed(3), roundTripCostPct: +(roundTripCost(state.config) * 100).toFixed(3) };
  logDecision({ sym, armId, action: sig.action, reason: sig.reason, price: sig.price, buyVotes });
  console.log(JSON.stringify(out, null, 2));
}

if (cmd === 'scan') {
  const symbols = (args[0] || 'BTCUSDT,ETHUSDT,SOLUSDT,AVAXUSDT,LINKUSDT,LTCUSDT,BCHUSDT,DOGEUSDT,DOTUSDT,XRPUSDT,AAVEUSDT,UNIUSDT').split(',').map(normSym);
  const armId = selectTradingArm(state); const arm = getArm(state, armId);   // best TRADING arm, even if live posture is FLAT
  const live = selectActiveArm(state);
  console.log(`=== 1m BUY scan — best trading arm ${armId} (live posture: ${live}${live === 'A0' ? ' = FLAT' : ''}) ===`);
  for (const sym of symbols) {
    const candles = await fetchBars(sym, '1m', { start: daysAgoISO(3) });
    const sig = liveSignal(candles, { long: false }, arm.knobs, state.config);
    const tag = sig.action === 'BUY' ? `*** BUY  tgt ${sig.target} stop ${sig.stop}` : `${sig.action} (${sig.reason})`;
    console.log(`${sym.padEnd(10)} @ ${String(sig.price).padStart(10)}  rsi ${String(sig.rsi ?? '-').padStart(5)}  -> ${tag}`);
  }
}

if (cmd === 'learn') {
  const sym = normSym(args[0] || 'BTCUSDT');
  const days = +(args[1] || 14);
  const candles = await fetchBars(sym, '1m', { start: daysAgoISO(days) });
  const real = readRealOutcomes();
  const res = learnAndEvolve(state, candles, real);
  state.meta.lastLearn = new Date().toISOString();
  saveState(state);
  console.log(`=== learn ${sym} ${days}d (${candles.length} 1m bars, ${real.length} real fills folded in) ===`);
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
  const sym = normSym(args[0] || 'BTCUSDT');
  const equity = +(args[1] || 100000);
  const arm = getArm(state, selectTradingArm(state));    // size a hypothetical entry off the best trading arm's stop
  const candles = await fetchBars(sym, '1m', { start: daysAgoISO(1) });
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
  const [symRaw, side, entryPx, exitPx, qty, armId, source] = args;
  const sym = normSym(symRaw);
  const line = recordOutcome({ sym, side, entryPx: +entryPx, exitPx: +exitPx, qty: +qty,
    armId: armId || state.activeArm, source: source || 'real', cfg: state.config });
  console.log('recorded:', JSON.stringify(line));
  console.log('note: run `node run.mjs learn` to fold this into the bandit.');
}

// ---------- AUTOPILOT: one cheap call per 1-min tick -> a ready-to-execute plan ----------
if (cmd === 'tick') {
  // tick "BTCUSDT,ETHUSDT,..." [equity]  -> JSON plan; Claude executes the orders via the Binance MCP.
  const symbols = (args[0] || 'BTCUSDT,ETHUSDT,SOLUSDT,AVAXUSDT,LINKUSDT,LTCUSDT,BCHUSDT,DOGEUSDT,DOTUSDT,XRPUSDT,AAVEUSDT,UNIUSDT').split(',').map(normSym);
  const equity = +(args[1] || 100000);
  const positions = loadPositions();
  const activeId = selectActiveArm(state);
  const plan = [];
  for (const sym of symbols) {
    const candles = await fetchBars(sym, '1m', { start: daysAgoISO(3) });
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
        execute: sig.action === 'SELL'
          ? `placeOrder("${sym}","SELL","MARKET",quantity=${held.qty}) then: node run.mjs closed "${sym}" <fillPx>`
          : null });
    } else {
      const arm = getArm(state, activeId);
      const sig = liveSignal(candles, { long: false }, arm.knobs, state.config);
      let order = null;
      if (sig.action === 'BUY') {
        const stopPct = arm.knobs.stopPct ?? 0.007;
        let notional = equity * state.config.riskPct / stopPct;
        const cap = equity * state.config.maxWeight; if (notional > cap) notional = cap;
        order = { notional: +notional.toFixed(2), qty: +(notional / last.c).toFixed(6), target: sig.target, stop: sig.stop,
          execute: `placeOrder("${sym}","BUY","MARKET",quoteOrderQty=${(+notional.toFixed(2))}) then: node run.mjs opened "${sym}" <fillPx> <fillQty> ${arm.id}` };
      }
      plan.push({ sym, holding: false, arm: arm.id, action: sig.action, reason: sig.reason, price: last.c, order });
    }
  }
  savePositions(positions);
  const lastLearn = state.meta.lastLearn ? Date.parse(state.meta.lastLearn) : 0;
  const learnDue = (Date.now() - lastLearn) > 55 * 60 * 1000;   // run learn ~hourly
  let ticks = 0; try { ticks = parseInt(readFileSync(TICKS_FILE, 'utf8').trim(), 10) || 0; } catch {}
  ticks++; try { writeFileSync(TICKS_FILE, String(ticks)); } catch {}
  const clearDue = ticks % 20 === 0;   // every 20 ticks (~20 min at 1m loop) -> reset Claude's context
  console.log(JSON.stringify({ ts: new Date().toISOString(), venue: 'binance', equity, activeArm: activeId, ticks, clearDue,
    learnDue, learnHint: learnDue ? `node run.mjs learn "${symbols[0]}" 14` : null, plan }, null, 2));
}

if (cmd === 'opened') {
  // opened SYM fillPx fillQty [armId]  -> record an executed BUY so later ticks can manage the exit.
  const [symRaw, fillPx, fillQty, armId] = args;
  const sym = normSym(symRaw);
  const positions = loadPositions();
  const candles = await fetchBars(sym, '1m', { start: daysAgoISO(1) });
  positions[sym] = { long: true, entryPx: +fillPx, qty: +fillQty, peak: +fillPx,
    openedAt: new Date().toISOString(), openedBarTime: candles[candles.length - 1]?.t, heldBars: 0,
    armId: armId || selectActiveArm(state) };
  savePositions(positions);
  console.log('opened', sym, JSON.stringify(positions[sym]));
}

if (cmd === 'closed') {
  // closed SYM fillPx  -> record an executed SELL, log the net-of-fee outcome for learning.
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
