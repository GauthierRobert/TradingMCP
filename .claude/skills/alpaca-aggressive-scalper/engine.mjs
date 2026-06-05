// alpaca-aggressive-scalper — core engine (pure, no network).
//
// A VERY AGGRESSIVE 1-minute long/flat crypto scalper that is still fee-honest.
// The aggression is made survivable by three research-backed levers (see SKILL.md):
//   1. MAKER-FIRST execution — post-only limit orders pay Alpaca's 0.15% maker fee,
//      not the 0.25% taker fee. Maker-on-both-legs ~= 0.30% round-trip vs 0.50% all-taker.
//      That nearly halves the fee floor that kills naive 1-min scalpers.
//   2. ATR VOLATILITY GATE — only fire when the expected move (ATR%) is large enough to
//      clear the (now lower) fee floor, and ideally when volatility is EXPANDING.
//   3. ATR-ADAPTIVE EXITS — take-profit / stop / trail scale with ATR-at-entry, so targets
//      are big in fast tape and tight in calm tape, but never drop below the fee floor.
// Entries are momentum-bursts + micro-breakouts (+ live order-book imbalance), so it acts
// FAST and takes EVERY qualifying setup — that is the aggression. The fee gate is what
// keeps it from bleeding out.
//
// A counterfactual multi-armed bandit scores a grid of parameter "arms" (plus a FLAT
// safety arm) on real recent bars AND on actual paper fills, then self-modifies the grid.
// Independent skill: shares no code with the sibling Alpaca skills. Causal throughout
// (a decision at bar i uses only bars <= i).
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(HERE, '_state');
const PARAMS = join(STATE_DIR, 'params.json');
const DECISIONS = join(STATE_DIR, 'decisions.ndjson');
const OUTCOMES = join(STATE_DIR, 'outcomes.ndjson');
const POSITIONS = join(STATE_DIR, 'positions.json');

// ---------- indicators (causal arrays) ----------
export function emaArray(vals, span) {
  const a = 2 / (span + 1); const out = new Array(vals.length); let e = vals[0]; out[0] = e;
  for (let i = 1; i < vals.length; i++) { e = a * vals[i] + (1 - a) * e; out[i] = e; }
  return out;
}
export function rsiArray(close, P = 14) {
  const out = new Array(close.length).fill(50);
  for (let i = P; i < close.length; i++) {
    let g = 0, l = 0;
    for (let k = i - P + 1; k <= i; k++) { const d = close[k] - close[k - 1]; if (d > 0) g += d; else l -= d; }
    const ag = g / P, al = l / P;
    out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return out;
}
// True-range EMA (Wilder-ish), causal. Returns ATR in PRICE units; divide by close for ATR%.
export function atrArray(candles, P = 7) {
  const n = candles.length, tr = new Array(n).fill(0), out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const h = candles[i].h, l = candles[i].l, pc = i ? candles[i - 1].c : candles[i].c;
    tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  const a = 2 / (P + 1); let e = tr[0]; out[0] = e;
  for (let i = 1; i < n; i++) { e = a * tr[i] + (1 - a) * e; out[i] = e; }
  return out;
}
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);

// ---------- fee model (MAKER-FIRST) ----------
// We assume post-only LIMIT entries and LIMIT take-profit exits (both pay the MAKER fee),
// but a STOP/trail/time exit crosses the book and pays the TAKER fee. So cost depends on
// HOW the trade ended — rewarding arms whose edge is harvested via maker take-profits.
export function roundTripMaker(cfg) { return 2 * cfg.makerFee + cfg.spreadEst; }          // entry maker + TP maker
export function roundTripStop(cfg) { return cfg.makerFee + cfg.takerFee + cfg.spreadEst; }  // entry maker + stop taker
export function feeFloor(cfg) { return roundTripMaker(cfg) + cfg.buffer; }                  // min TP that clears best-case cost
function exitCost(cfg, reason) { return reason === 'take-profit' ? roundTripMaker(cfg) : roundTripStop(cfg); }

// ---------- precompute everything an arm needs, once ----------
function prep(candles) {
  const close = candles.map(c => c.c), high = candles.map(c => c.h), low = candles.map(c => c.l), vol = candles.map(c => c.v ?? 0);
  return { close, high, low, vol, N: candles.length };
}
function context(P, candles, k, cfg) {
  return {
    emaF: emaArray(P.close, k.emaFast), emaM: emaArray(P.close, k.emaMid), emaS: emaArray(P.close, k.emaSlow),
    rsi: rsiArray(P.close, 14),
    atr: atrArray(candles, cfg.atrPeriod ?? 7),
    atrSlow: atrArray(candles, cfg.atrSlowPeriod ?? 20),
  };
}

// ---------- the signal: does arm `k` enter at bar i? (flat -> long) ----------
// Aggressive: momentum-burst OR micro-breakout OR pullback-continuation, gated by ATR.
// `obi` (order-book imbalance in [0,1], bid share of top-of-book) is a LIVE-only confirmation;
// pass undefined in backtest so it is ignored.
function entryAt(P, ctx, i, k, cfg, obi) {
  const warm = Math.max(k.emaSlow, k.breakoutN, cfg.atrSlowPeriod ?? 20, 14) + 2;
  if (i < warm) return null;
  const c = P.close[i];
  const atrPct = ctx.atr[i] / c;
  // (1) VOLATILITY GATE — the move must be big enough to clear the maker fee floor.
  if (atrPct < k.minAtrPct) return null;
  if (k.requireExpansion && ctx.atr[i] < k.volExpand * ctx.atrSlow[i]) return null;
  // (2) light trend posture (aggressive arms may switch the macro gate OFF for pure momentum)
  const emaF = ctx.emaF[i], emaM = ctx.emaM[i];
  const slopeOk = ctx.emaS[i] > ctx.emaS[i - k.slopeBars];
  if (k.macroGate && !slopeOk) return null;
  const rsi = ctx.rsi[i];
  if (rsi >= k.rsiMaxBuy) return null;
  // (3) order-book imbalance confirmation (live only)
  if (obi !== undefined && k.obiBuy && obi < k.obiBuy) return null;
  // --- triggers ---
  let donHigh = -Infinity; for (let j = i - k.breakoutN; j < i; j++) if (P.high[j] > donHigh) donHigh = P.high[j];
  let avgVol = 0; for (let j = i - 20; j < i; j++) avgVol += P.vol[j]; avgVol /= 20;
  const volOk = avgVol <= 0 ? true : P.vol[i] >= k.volMult * avgVol;
  const breakout = c > donHigh && emaF > emaM && volOk;
  // momentum burst: this bar's return is a large multiple of ATR (a real impulse, not noise)
  const barRet = c / P.close[i - 1] - 1;
  const burst = emaF > emaM && barRet >= k.burstK * atrPct && volOk;
  // pullback-continuation (only when arm is in 'both' mode = more aggressive)
  let pullback = false;
  if (k.entryMode === 'both') {
    const nearMid = c <= emaM * (1 + k.pbBand) && c >= emaM * (1 - k.pbBand);
    pullback = emaF > emaM && emaM > ctx.emaS[i] && nearMid && rsi > ctx.rsi[i - 1] && rsi < 60;
  }
  if (breakout) return { trigger: 'breakout', px: c, atrPct };
  if (burst && k.entryMode !== 'breakout') return { trigger: 'burst', px: c, atrPct };
  if (pullback) return { trigger: 'pullback', px: c, atrPct };
  return null;
}

// ---------- the exit: should an open long close at bar i? (ATR-adaptive levels) ----------
function levels(k, cfg, atrPctEntry) {
  const floor = feeFloor(cfg);
  const tp = Math.max(floor, k.tpAtrMult * atrPctEntry);   // TP never drops below the fee floor
  const stop = Math.max(0.003, k.stopAtrMult * atrPctEntry);
  const trail = Math.max(0.0025, k.trailAtrMult * atrPctEntry);
  const trailArm = Math.max(0.003, k.trailArmAtrMult * atrPctEntry);
  return { tp, stop, trail, trailArm };
}
function exitAt(P, ctx, i, k, cfg, pos) {
  const c = P.close[i];
  const held = i - pos.entryIdx;
  const peak = pos.peak;
  const L = levels(k, cfg, pos.atrPctEntry);
  if (c <= pos.entryPx * (1 - L.stop)) return { reason: 'stop', px: c };
  if (c >= pos.entryPx * (1 + L.tp)) return { reason: 'take-profit', px: c };
  const trailArmed = peak >= pos.entryPx * (1 + L.trailArm);
  if (trailArmed && c <= peak * (1 - L.trail)) return { reason: 'trail', px: c };
  if (held >= (k.minHold ?? 1) && c < ctx.emaM[i]) return { reason: 'trend-break', px: c };  // fast: mid EMA, not slow
  if (held >= k.maxHold) return { reason: 'time-stop', px: c };
  return null;
}

// ---------- counterfactual backtest of one arm over a window ----------
// Returns the per-trade net-of-fee pnl stream (the bandit reward signal). Cost is charged
// per the exit type (maker TP vs taker stop) — the honest, execution-aware reward.
export function simulateArm(candles, k, cfg) {
  if (k.flat) return [];
  const P = prep(candles); const ctx = context(P, candles, k, cfg);
  const cooldown = k.cooldown ?? 0;
  const trades = []; let pos = null, lastExit = -Infinity;
  for (let i = 0; i < P.N; i++) {
    if (!pos) {
      if (i - lastExit <= cooldown) continue;
      const e = entryAt(P, ctx, i, k, cfg);     // no obi in backtest
      if (e) pos = { entryIdx: i, entryPx: e.px, peak: e.px, trigger: e.trigger, atrPctEntry: e.atrPct };
    } else {
      if (P.close[i] > pos.peak) pos.peak = P.close[i];
      const x = exitAt(P, ctx, i, k, cfg, pos);
      if (x) {
        const pnl = (x.px / pos.entryPx - 1) - exitCost(cfg, x.reason);
        trades.push({ pnl, held: i - pos.entryIdx, reason: x.reason, trigger: pos.trigger });
        pos = null; lastExit = i;
      }
    }
  }
  return trades;
}

// ---------- LIVE signal: what does THIS arm say right now, given position state? ----------
export function liveSignal(candles, position, k, cfg, obi) {
  const P = prep(candles); const i = P.N - 1; const c = P.close[i];
  if (k.flat) {
    if (position && position.long) return { action: 'SELL', reason: 'flat arm active — stand down (no net-of-fee edge found)', price: c };
    return { action: 'HOLD', reason: 'flat arm active — cash is the position (no arm beats the fee floor on recent bars)', price: c };
  }
  const ctx = context(P, candles, k, cfg);
  const atrPctNow = ctx.atr[i] / c;
  if (position && position.long) {
    const atrPctEntry = position.atrPctEntry || atrPctNow;
    const pos = { entryIdx: i - (position.heldBars || 0), entryPx: position.entryPx || c,
      peak: Math.max(position.peakSince || c, c), atrPctEntry };
    const L = levels(k, cfg, atrPctEntry);
    const x = exitAt(P, ctx, i, k, cfg, pos);
    const gainPct = +((c / pos.entryPx - 1) * 100).toFixed(3);
    if (x) return { action: 'SELL', reason: x.reason, price: c, gainPct, exitVia: x.reason === 'take-profit' ? 'maker limit' : 'taker market' };
    return { action: 'HOLD', reason: 'in-trade, no exit condition', price: c, gainPct,
      target: +(pos.entryPx * (1 + L.tp)).toFixed(4), trailStop: +(pos.peak * (1 - L.trail)).toFixed(4),
      hardStop: +(pos.entryPx * (1 - L.stop)).toFixed(4) };
  }
  const e = entryAt(P, ctx, i, k, cfg, obi);
  const floor = feeFloor(cfg);
  if (!e) return { action: 'HOLD', reason: 'no entry trigger', price: c, atrPct: +(atrPctNow * 100).toFixed(3),
    rsi: +ctx.rsi[i].toFixed(1), obi: obi !== undefined ? +obi.toFixed(3) : undefined };
  const L = levels(k, cfg, e.atrPct);
  const tpClears = L.tp >= floor;   // by construction true, but report it
  return { action: 'BUY', reason: `entry: ${e.trigger}`, price: c, atrPct: +(e.atrPct * 100).toFixed(3),
    target: +(c * (1 + L.tp)).toFixed(4), stop: +(c * (1 - L.stop)).toFixed(4),
    tpPct: +(L.tp * 100).toFixed(3), stopPct: +(L.stop * 100).toFixed(3), feeFloorPct: +(floor * 100).toFixed(3), tpClears,
    makerLimitPx: +(c * (1 - cfg.makerInsidePct ?? 0)).toFixed(4),  // post just inside to stay maker
    rsi: +ctx.rsi[i].toFixed(1), obi: obi !== undefined ? +obi.toFixed(3) : undefined, atrPctEntry: e.atrPct };
}

// ---------- bandit stats ----------
function freshStats() { return { ewMean: 0, n: 0, trades: 0, wins: 0, losses: 0, sumPnl: 0 }; }
function applyTrades(stat, trades, cfg, weight = 1) {
  const alpha = Math.min(0.9, cfg.alpha * weight);
  for (const t of trades) {
    stat.ewMean = (1 - alpha) * stat.ewMean + alpha * t.pnl;
    stat.n = stat.n * cfg.gamma + 1;
    stat.trades += 1; stat.sumPnl += t.pnl;
    if (t.pnl > 0) stat.wins += 1; else stat.losses += 1;
  }
  return stat;
}
const armScore = (a) => a.stats.ewMean;
const qualifies = (a, cfg) => a.knobs.flat || a.stats.trades >= cfg.minSamplesLeader;

export function selectActiveArm(state) {
  const cfg = state.config;
  const qualified = state.arms.filter(a => qualifies(a, cfg));
  const tradingQualified = qualified.filter(a => !a.knobs.flat);
  // COLD START — no trading arm has enough samples to judge yet. Honour the aggressive seed
  // (state.activeArm) so it actually trades from the first tick, as requested. The bandit only
  // takes over once a trading arm has >= minSamplesLeader trades; until then we trust the seed.
  if (tradingQualified.length === 0) {
    const seed = state.arms.find(a => a.id === state.activeArm);
    if (seed && !seed.knobs.flat) return seed.id;
    return (state.arms.find(a => a.knobs.flat) || state.arms[0]).id;
  }
  // NORMAL — rank all qualified arms (incl. FLAT pinned at 0); best net-of-fee EW mean wins.
  // Once the aggressive arms have evidence and it's negative, FLAT wins and we demote to cash.
  const ranked = [...qualified].sort((x, y) => armScore(y) - armScore(x));
  return ranked[0].id;
}
export function selectTradingArm(state) {
  const trading = state.arms.filter(a => !a.knobs.flat);
  const ranked = [...trading].sort((x, y) => armScore(y) - armScore(x));
  return (ranked[0] || trading[0]).id;
}

// ---------- self-learning + self-modification ----------
export function learnAndEvolve(state, candles, realOutcomes = []) {
  const cfg = state.config;
  for (const a of state.arms) {
    a.stats = freshStats();
    if (a.knobs.flat) { a.stats.ewMean = 0; a.stats.trades = cfg.minSamplesLeader; continue; }
    applyTrades(a.stats, simulateArm(candles, a.knobs, cfg), cfg, 1);
  }
  for (const o of realOutcomes) {
    const a = state.arms.find(x => x.id === o.armId) || state.arms.find(x => x.id === state.activeArm);
    if (a) applyTrades(a.stats, [{ pnl: o.pnlPct / 100 }], cfg, cfg.realWeight);
  }
  const tradingArms = state.arms.filter(a => !a.knobs.flat);
  const leader = [...tradingArms].sort((x, y) => armScore(y) - armScore(x))[0];
  const neighbours = leader ? neighbourArms(leader.knobs, cfg) : [];
  let best = null;
  for (const kn of neighbours) {
    if (state.arms.some(a => sameKnobs(a.knobs, kn))) continue;
    const st = freshStats(); applyTrades(st, simulateArm(candles, kn, cfg), cfg, 1);
    if (st.trades >= cfg.minSamplesLeader && (!best || st.ewMean > best.st.ewMean)) best = { kn, st };
  }
  const changes = [];
  if (leader && best && best.st.ewMean > leader.stats.ewMean + cfg.evolveMargin) {
    const id = nextArmId(state);
    state.arms.push({ id, note: `evolved from ${leader.id}`, knobs: best.kn, stats: best.st, born: nowISO(), parent: leader.id });
    changes.push(`+${id} (ewMean ${best.st.ewMean.toFixed(4)} > leader ${leader.id} ${leader.stats.ewMean.toFixed(4)})`);
    if (state.arms.length > cfg.maxArms) {
      const victim = [...state.arms].filter(a => !a.knobs.flat && qualifies(a, cfg) && a.id !== leader.id && a.id !== state.activeArm && a.id !== id)
        .sort((x, y) => armScore(x) - armScore(y))[0];
      if (victim) { state.arms = state.arms.filter(a => a.id !== victim.id); changes.push(`-${victim.id} (pruned, ewMean ${victim.stats.ewMean.toFixed(4)})`); }
    }
  }
  const newActive = selectActiveArm(state);
  if (newActive !== state.activeArm) { changes.push(`active ${state.activeArm} -> ${newActive}`); state.activeArm = newActive; }
  state.meta.updated = nowISO(); state.meta.version = (state.meta.version || 0) + 1;
  if (changes.length) state.changelog.unshift({ ts: nowISO(), window: candles.length, changes });
  state.changelog = state.changelog.slice(0, 50);
  return { leader: leader?.id, active: state.activeArm, changes };
}

// neighbour arms = small bounded steps on the aggressive knobs around the leader.
function neighbourArms(k, cfg) {
  const out = [];
  const push = (patch) => out.push({ ...k, ...patch });
  push({ tpAtrMult: +Math.max(0.8, k.tpAtrMult - 0.3).toFixed(2) });
  push({ tpAtrMult: +Math.min(3.5, k.tpAtrMult + 0.3).toFixed(2) });
  push({ stopAtrMult: +Math.max(0.6, k.stopAtrMult - 0.2).toFixed(2) });
  push({ stopAtrMult: +Math.min(2.5, k.stopAtrMult + 0.2).toFixed(2) });
  push({ trailAtrMult: +Math.max(0.5, k.trailAtrMult - 0.2).toFixed(2) });
  push({ trailAtrMult: +Math.min(2.5, k.trailAtrMult + 0.2).toFixed(2) });
  push({ maxHold: Math.max(4, k.maxHold - 3) });
  push({ maxHold: Math.min(30, k.maxHold + 3) });
  push({ breakoutN: Math.max(5, k.breakoutN - 2) });
  push({ breakoutN: Math.min(24, k.breakoutN + 2) });
  push({ burstK: +Math.max(0.3, k.burstK - 0.15).toFixed(2) });
  push({ burstK: +Math.min(1.5, k.burstK + 0.15).toFixed(2) });
  push({ minAtrPct: +Math.max(0.0005, k.minAtrPct - 0.0003).toFixed(4) });
  push({ minAtrPct: +Math.min(0.004, k.minAtrPct + 0.0003).toFixed(4) });
  push({ cooldown: Math.max(0, k.cooldown - 1) });
  push({ cooldown: Math.min(8, k.cooldown + 1) });
  push({ macroGate: !k.macroGate });
  push({ entryMode: k.entryMode === 'both' ? 'breakout' : 'both' });
  return out;
}
const sameKnobs = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function nextArmId(state) {
  let n = state.arms.length + 1;
  while (state.arms.some(a => a.id === 'A' + n)) n++;
  return 'A' + n;
}

// ---------- state IO ----------
function nowISO() { return new Date().toISOString(); }
export function loadState() {
  if (!existsSync(PARAMS)) throw new Error(`missing ${PARAMS} — seed it first`);
  return JSON.parse(readFileSync(PARAMS, 'utf8'));
}
export function saveState(state) {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(PARAMS, JSON.stringify(state, null, 2));
}
export function logDecision(rec) {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  appendFileSync(DECISIONS, JSON.stringify({ ts: nowISO(), ...rec }) + '\n');
}
export function recordOutcome(rec) {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  // net pnl% charges the realistic exit cost (taker if it was a stop/trail/time, maker if TP)
  const cfg = rec.cfg || { makerFee: 0.0015, takerFee: 0.0025, spreadEst: 0.0006 };
  const cost = (rec.exitReason === 'take-profit') ? roundTripMaker(cfg) : roundTripStop(cfg);
  const pnlPct = rec.pnlPct ?? ((rec.exitPx / rec.entryPx - 1) * 100 - cost * 100);
  const line = { ts: nowISO(), source: rec.source || 'real', ...rec, pnlPct: +pnlPct.toFixed(3) };
  delete line.cfg;
  appendFileSync(OUTCOMES, JSON.stringify(line) + '\n');
  return line;
}
export function readRealOutcomes() {
  if (!existsSync(OUTCOMES)) return [];
  return readFileSync(OUTCOMES, 'utf8').trim().split('\n').filter(Boolean)
    .map(l => JSON.parse(l)).filter(o => o.source === 'real');
}
export function getArm(state, id) { return state.arms.find(a => a.id === id); }
export function loadPositions() { return existsSync(POSITIONS) ? JSON.parse(readFileSync(POSITIONS, 'utf8')) : {}; }
export function savePositions(p) { if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true }); writeFileSync(POSITIONS, JSON.stringify(p, null, 2)); }
export { STATE_DIR, PARAMS };
