// alpaca-adaptive-scalper — core engine (pure, no network).
//
// One job: a FAST 1-minute long/flat momentum decision that improves itself.
// The strategy is a small parameter vector (an "arm"); a counterfactual bandit
// scores every arm on real recent price action (fictive feedback) and on actual
// paper fills (real feedback), then SELF-MODIFIES the arm grid toward what works.
//
// Independent skill: no imports from the sibling Alpaca skills. Causal throughout
// (a decision at bar i uses only bars <= i). Medium-aggressive defaults.
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
// Wilder-ish RSI as a causal array (simple rolling averages, period P).
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
// Rate-of-change over n bars: close[i]/close[i-n]-1. The "X% within N minutes" detector.
export function rocArray(close, n) {
  const out = new Array(close.length).fill(0);
  for (let i = n; i < close.length; i++) out[i] = close[i] / close[i - n] - 1;
  return out;
}
// Wilder ATR (absolute price units) as a causal array, from true range.
export function atrArray(high, low, close, P = 14) {
  const tr = new Array(close.length).fill(0);
  for (let i = 1; i < close.length; i++) {
    const pc = close[i - 1];
    tr[i] = Math.max(high[i] - low[i], Math.abs(high[i] - pc), Math.abs(low[i] - pc));
  }
  const out = new Array(close.length).fill(0); let a = 0;
  for (let i = 1; i < close.length; i++) {
    if (i <= P) { a += tr[i]; out[i] = a / i; }
    else { a = (a * (P - 1) + tr[i]) / P; out[i] = a; }       // Wilder smoothing
  }
  return out;
}
// MACD line / signal / histogram (causal) from EMAs — trend-momentum confirmation.
export function macdArrays(close, fast = 12, slow = 26, signal = 9) {
  const ef = emaArray(close, fast), es = emaArray(close, slow);
  const macd = close.map((_, i) => ef[i] - es[i]);
  const sig = emaArray(macd, signal);
  const hist = macd.map((m, i) => m - sig[i]);
  return { macd, signal: sig, hist };
}
// Bollinger bands + %B (position within band, 0=lower 1=upper) + bandwidth (squeeze proxy).
export function bollingerArrays(close, n = 20, k = 2) {
  const N = close.length;
  const mid = new Array(N).fill(close[0]), upper = new Array(N).fill(close[0]),
        lower = new Array(N).fill(close[0]), pctB = new Array(N).fill(0.5), bw = new Array(N).fill(0);
  for (let i = n - 1; i < N; i++) {
    let m = 0; for (let j = i - n + 1; j <= i; j++) m += close[j]; m /= n;
    let v = 0; for (let j = i - n + 1; j <= i; j++) { const d = close[j] - m; v += d * d; } v = Math.sqrt(v / n);
    const up = m + k * v, lo = m - k * v;
    mid[i] = m; upper[i] = up; lower[i] = lo;
    pctB[i] = up === lo ? 0.5 : (close[i] - lo) / (up - lo);
    bw[i] = m === 0 ? 0 : (up - lo) / m;
  }
  return { mid, upper, lower, pctB, bw };
}
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);

// ---------- fee model ----------
// Realistic round-trip: maker entry + taker exit (a stop/trail usually exits at market) + spread.
export function roundTripCost(cfg) { return cfg.makerFee + cfg.takerFee + cfg.spreadEst; }
export function feeFloor(cfg) { return roundTripCost(cfg) + cfg.buffer; } // min take-profit that can clear cost

// ---------- precompute everything an arm needs, once ----------
function prep(candles) {
  const close = candles.map(c => c.c), high = candles.map(c => c.h),
        low = candles.map(c => c.l ?? c.c), vol = candles.map(c => c.v ?? 0);
  return { close, high, low, vol, N: candles.length };
}

// Precompute every factor an arm consults, once. Optional factors are built only
// when the arm's knobs enable them, so legacy arms stay cheap. `_floor` = fee floor.
function buildCtx(P, k, cfg) {
  const ctx = {
    emaF: emaArray(P.close, k.emaFast), emaM: emaArray(P.close, k.emaMid),
    emaS: emaArray(P.close, k.emaSlow), rsi: rsiArray(P.close, k.rsiLen ?? 14),
    _floor: feeFloor(cfg),
  };
  if (k.momWindow)  ctx.roc  = rocArray(P.close, k.momWindow);
  if (k.atrLen)     ctx.atr  = atrArray(P.high, P.low, P.close, k.atrLen);
  if (k.macdConfirm) ctx.macd = macdArrays(P.close, k.macdFast ?? 12, k.macdSlow ?? 26, k.macdSignal ?? 9);
  if (k.bbConfirm || k.bbLen) ctx.bb = bollingerArrays(P.close, k.bbLen ?? 20, k.bbK ?? 2);
  return ctx;
}

// ---------- multi-factor entry: does arm `k` enter at bar i? (flat -> long) ----------
// Up to four TRIGGERS (breakout / pullback / momentum-burst / oversold-reversal), each
// then filtered by opt-in CONFIRMATIONS (volume, ATR volatility gate, MACD histogram).
// entryMode may be a string ('both','breakout',…) or an array of mode names.
function entryAt(P, ctx, i, k) {
  const warm = Math.max(k.emaSlow, k.breakoutN, k.slopeBars, k.momWindow ?? 0, k.atrLen ?? 0, 26) + 1;
  if (i < warm) return null;
  const c = P.close[i], emaF = ctx.emaF[i], emaM = ctx.emaM[i], emaS = ctx.emaS[i], rsi = ctx.rsi[i];
  const upRegime = ctx.emaS[i] > ctx.emaS[i - k.slopeBars];      // slow EMA rising
  const modes = Array.isArray(k.entryMode) ? k.entryMode : [k.entryMode];
  const has = (m) => modes.includes(m) || modes.includes('both');

  let trig = null;
  // 1) breakout: new Donchian high inside an up-stack
  if (has('breakout')) {
    let donHigh = -Infinity; for (let j = i - k.breakoutN; j < i; j++) if (P.high[j] > donHigh) donHigh = P.high[j];
    if (c > donHigh && emaF > emaM && upRegime && rsi < k.rsiMaxBuy) trig = 'breakout';
  }
  // 2) pullback-continuation: dip to mid-EMA in an up-stack, RSI turning up
  if (!trig && has('pullback')) {
    const nearMid = c <= emaM * (1 + k.pbBand) && c >= emaM * (1 - k.pbBand);
    if (emaF > emaM && emaM > emaS && nearMid && rsi > ctx.rsi[i - 1] && rsi < 60) trig = 'pullback';
  }
  // 3) momentum-burst: ROC over momWindow >= momThresh (the "4% within 20 min" detector)
  if (!trig && modes.includes('momentum') && ctx.roc) {
    if (ctx.roc[i] >= k.momThresh && emaF > emaM && rsi < (k.momRsiMax ?? 82)) trig = 'momentum';
  }
  // 4) oversold-reversal: RSI dipped below rsiOSBuy and is turning up while the trend
  //    STRUCTURE is still intact (mid-EMA above slow, price above slow). Uses structure,
  //    not slow-EMA slope — a dip deep enough to oversold RSI bends the slope down, so
  //    requiring "slope rising" would reject the very bounce we want to buy.
  if (!trig && modes.includes('oversold')) {
    const structUp = emaM > emaS && c > emaS * (1 - (k.osBandBelow ?? 0.01));
    if (ctx.rsi[i - 1] < (k.rsiOSBuy ?? 35) && rsi > ctx.rsi[i - 1] && structUp) trig = 'oversold';
  }
  if (!trig) return null;

  // ----- confirmations (each opt-in via knobs) -----
  let avgVol = 0; for (let j = i - 20; j < i; j++) avgVol += P.vol[j]; avgVol /= 20;
  if (!(avgVol <= 0 ? true : P.vol[i] >= k.volMult * avgVol)) return null;          // volume
  if (ctx.atr && k.atrGateMult) {                                                    // ATR gate: expected move clears fees
    if ((ctx.atr[i] / c) * k.atrGateMult < ctx._floor) return null;
  }
  if (k.macdConfirm && ctx.macd) {                                                    // MACD: hist > 0 and rising
    if (!(ctx.macd.hist[i] > 0 && ctx.macd.hist[i] > ctx.macd.hist[i - 1])) return null;
  }
  if (k.bbConfirm && ctx.bb && trig !== 'momentum') {                                 // Bollinger: don't chase a pinned upper band (except momentum)
    if (ctx.bb.pctB[i] > (k.bbMaxPctB ?? 1.05)) return null;
  }
  return { trigger: trig, px: c };
}

// ---------- the exit: should an open long close at bar i? ----------
function exitAt(P, ctx, i, k, pos) {
  const c = P.close[i];
  const held = i - pos.entryIdx;
  const peak = pos.peak;
  // hard stop: fixed pct, tightened by an ATR-scaled stop if enabled
  let stopLvl = pos.entryPx * (1 - k.stopPct);
  if (ctx.atr && k.atrStopMult) stopLvl = Math.min(stopLvl, pos.entryPx - ctx.atr[i] * k.atrStopMult);
  if (c <= stopLvl) return { reason: 'stop', px: c };
  // take-profit: fixed pct, or the LARGER ATR-scaled target if enabled (ride the bigger move)
  let tpLvl = pos.entryPx * (1 + k.tpPct);
  if (ctx.atr && k.atrTpMult) tpLvl = Math.max(tpLvl, pos.entryPx + ctx.atr[i] * k.atrTpMult);
  if (c >= tpLvl) return { reason: 'take-profit', px: c };
  // overbought exit: lock gains once RSI is stretched and we're in profit
  if (k.rsiOBExit && ctx.rsi[i] >= k.rsiOBExit && c > pos.entryPx) return { reason: 'overbought', px: c };
  // trailing stop (armed after trailArmPct of gain)
  const trailArmed = peak >= pos.entryPx * (1 + k.trailArmPct);
  if (trailArmed && c <= peak * (1 - k.trailPct)) return { reason: 'trail', px: c };
  // discretionary trend-failure exit on the SLOW ema, after `minHold` bars (anti-churn)
  if (held >= (k.minHold ?? 3) && c < ctx.emaS[i]) return { reason: 'trend-break', px: c };
  if (held >= k.maxHold) return { reason: 'time-stop', px: c };
  return null;
}

// ---------- counterfactual backtest of one arm over a window ----------
// Returns the per-trade net-of-fee pnl stream (the bandit reward signal).
export function simulateArm(candles, k, cfg) {
  if (k.flat) return [];                                  // the do-nothing arm: zero trades, zero reward
  const P = prep(candles);
  const ctx = buildCtx(P, k, cfg);
  const cost = roundTripCost(cfg);
  const cooldown = k.cooldown ?? 0;
  const trades = []; let pos = null, lastExit = -Infinity;
  for (let i = 0; i < P.N; i++) {
    if (!pos) {
      if (i - lastExit <= cooldown) continue;             // anti-churn: wait `cooldown` bars after an exit
      const e = entryAt(P, ctx, i, k);
      if (e) pos = { entryIdx: i, entryPx: e.px, peak: e.px, trigger: e.trigger };
    } else {
      if (P.close[i] > pos.peak) pos.peak = P.close[i];
      const x = exitAt(P, ctx, i, k, pos);
      if (x) {
        const pnl = (x.px / pos.entryPx - 1) - cost;     // net of round-trip cost
        trades.push({ pnl, held: i - pos.entryIdx, reason: x.reason, trigger: pos.trigger });
        pos = null; lastExit = i;
      }
    }
  }
  return trades;
}

// ---------- LIVE signal: what does THIS arm say right now, given position state? ----------
export function liveSignal(candles, position, k, cfg) {
  const P = prep(candles);
  const i = P.N - 1;
  const cLast = P.close[i];
  if (k.flat) {                                          // do-nothing arm is live: stand down
    if (position && position.long) return { action: 'SELL', reason: 'flat arm active — stand down (no net-of-fee edge found)', price: cLast };
    return { action: 'HOLD', reason: 'flat arm active — cash is the position (no arm beats the fee floor on recent bars)', price: cLast };
  }
  const ctx = buildCtx(P, k, cfg);
  const c = P.close[i];
  const floor = feeFloor(cfg);
  const tpOk = k.tpPct >= floor;     // does this arm's target even clear the fee floor?
  if (position && position.long) {
    const pos = { entryIdx: i - (position.heldBars || 0), entryPx: position.entryPx || c,
      peak: Math.max(position.peakSince || c, c) };
    const x = exitAt(P, ctx, i, k, pos);
    const gainPct = +((c / pos.entryPx - 1) * 100).toFixed(3);
    if (x) return { action: 'SELL', reason: x.reason, price: c, gainPct, tpOk };
    return { action: 'HOLD', reason: 'in-trade, no exit condition', price: c, gainPct, tpOk,
      trailStop: +(pos.peak * (1 - k.trailPct)).toFixed(4), hardStop: +(pos.entryPx * (1 - k.stopPct)).toFixed(4) };
  }
  const e = entryAt(P, ctx, i, k);
  if (e && !tpOk) return { action: 'HOLD', reason: `entry seen (${e.trigger}) but tp ${(k.tpPct*100).toFixed(2)}% < fee floor ${(floor*100).toFixed(2)}%`, price: c, tpOk };
  if (e) return { action: 'BUY', reason: `entry: ${e.trigger}`, price: c, tpOk,
    target: +(c * (1 + k.tpPct)).toFixed(4), stop: +(c * (1 - k.stopPct)).toFixed(4),
    rsi: +ctx.rsi[i].toFixed(1), emaFast: +ctx.emaF[i].toFixed(2), emaMid: +ctx.emaM[i].toFixed(2), emaSlow: +ctx.emaS[i].toFixed(2) };
  return { action: 'HOLD', reason: 'no entry trigger', price: c, tpOk,
    rsi: +ctx.rsi[i].toFixed(1), emaFast: +ctx.emaF[i].toFixed(2), emaMid: +ctx.emaM[i].toFixed(2), emaSlow: +ctx.emaS[i].toFixed(2) };
}

// ---------- bandit stats ----------
function freshStats() { return { ewMean: 0, n: 0, trades: 0, wins: 0, losses: 0, sumPnl: 0 }; }
// Apply a stream of trade rewards to an arm's stats with EW (recency) weighting.
// weight>1 lets REAL fills count more than FICTIVE ones.
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
const armScore = (a) => a.stats.ewMean;             // exploit score (flat arm = 0)
const qualifies = (a, cfg) => a.knobs.flat || a.stats.trades >= cfg.minSamplesLeader;

// Pick the live arm: best qualified arm by EW mean (incl. the flat arm); fall back to active / first.
export function selectActiveArm(state) {
  const cfg = state.config;
  const ranked = [...state.arms].filter(a => qualifies(a, cfg)).sort((x, y) => armScore(y) - armScore(x));
  if (ranked.length) return ranked[0].id;
  const cur = state.arms.find(a => a.id === state.activeArm);
  return (cur || state.arms[0]).id;
}

// Pick the best TRADING (non-flat) arm — for scanning/sizing a hypothetical entry even
// while the live posture is FLAT. Falls back to the first trading arm.
export function selectTradingArm(state) {
  const trading = state.arms.filter(a => !a.knobs.flat);
  const ranked = [...trading].sort((x, y) => armScore(y) - armScore(x));
  return (ranked[0] || trading[0]).id;
}

// ---------- self-learning + self-modification ----------
// Recompute every arm's stats from the recent window (fictive feedback), fold in
// any logged real fills (weighted up), then EVOLVE: spawn neighbours of the leader,
// keep a winner, prune a loser. Bounded + audited.
export function learnAndEvolve(state, candles, realOutcomes = []) {
  const cfg = state.config;
  // 1. fictive: re-score each arm fresh on the window. The flat arm is pinned to 0
  //    reward and always-qualified, so it wins whenever every trading arm is net-negative.
  for (const a of state.arms) {
    a.stats = freshStats();
    if (a.knobs.flat) { a.stats.ewMean = 0; a.stats.trades = cfg.minSamplesLeader; continue; }
    applyTrades(a.stats, simulateArm(candles, a.knobs, cfg), cfg, 1);
  }
  // 2. real: apply logged paper fills to the arm that produced them, weighted up
  for (const o of realOutcomes) {
    const a = state.arms.find(x => x.id === o.armId) || state.arms.find(x => x.id === state.activeArm);
    if (a) applyTrades(a.stats, [{ pnl: o.pnlPct / 100 }], cfg, cfg.realWeight);
  }
  // 3. evolve around the best TRADING arm (the flat arm has no knobs to mutate)
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
    state.arms.push({ id, knobs: best.kn, stats: best.st, born: nowISO(), parent: leader.id });
    changes.push(`+${id} (ewMean ${best.st.ewMean.toFixed(4)} > leader ${leader.id} ${leader.stats.ewMean.toFixed(4)})`);
    // prune if over capacity: drop worst qualified TRADING arm that is neither leader nor active nor newborn
    if (state.arms.length > cfg.maxArms) {
      const victim = [...state.arms].filter(a => !a.knobs.flat && qualifies(a, cfg) && a.id !== leader.id && a.id !== state.activeArm && a.id !== id)
        .sort((x, y) => armScore(x) - armScore(y))[0];
      if (victim) { state.arms = state.arms.filter(a => a.id !== victim.id); changes.push(`-${victim.id} (pruned, ewMean ${victim.stats.ewMean.toFixed(4)})`); }
    }
  }
  // 4. promote the new live arm
  const newActive = selectActiveArm(state);
  if (newActive !== state.activeArm) { changes.push(`active ${state.activeArm} -> ${newActive}`); state.activeArm = newActive; }
  state.meta.updated = nowISO(); state.meta.version = (state.meta.version || 0) + 1;
  if (changes.length) state.changelog.unshift({ ts: nowISO(), window: candles.length, changes });
  state.changelog = state.changelog.slice(0, 50);
  return { leader: leader.id, active: state.activeArm, changes };
}

// neighbour arms = small bounded steps on the exit/entry knobs around the leader.
function neighbourArms(k, cfg) {
  const floor = feeFloor(cfg);
  const clampTp = (v) => Math.max(floor, +v.toFixed(4));
  const out = [];
  const push = (patch) => out.push({ ...k, ...patch });
  push({ tpPct: clampTp(k.tpPct + 0.003) });
  push({ tpPct: clampTp(k.tpPct - 0.003) });
  push({ stopPct: +Math.max(0.004, k.stopPct - 0.002).toFixed(4) });
  push({ stopPct: +Math.min(0.015, k.stopPct + 0.002).toFixed(4) });
  push({ trailPct: +Math.max(0.003, k.trailPct - 0.002).toFixed(4) });
  push({ trailPct: +Math.min(0.015, k.trailPct + 0.002).toFixed(4) });
  push({ maxHold: Math.max(4, k.maxHold - 4) });
  push({ maxHold: Math.min(36, k.maxHold + 4) });
  push({ breakoutN: Math.max(6, k.breakoutN - 2) });
  push({ breakoutN: Math.min(24, k.breakoutN + 2) });
  push({ entryMode: k.entryMode === 'both' ? 'breakout' : 'both' });
  // ---- multi-factor knob steps (only meaningful when the factor is enabled on the arm) ----
  if (k.momThresh != null)  { push({ momThresh: +Math.max(0.008, k.momThresh - 0.004).toFixed(4) });
                              push({ momThresh: +Math.min(0.05,  k.momThresh + 0.004).toFixed(4) }); }
  if (k.momWindow != null)  { push({ momWindow: Math.max(10, k.momWindow - 5) });
                              push({ momWindow: Math.min(40, k.momWindow + 5) }); }
  if (k.atrGateMult != null){ push({ atrGateMult: +Math.max(0.5, k.atrGateMult - 0.25).toFixed(2) });
                              push({ atrGateMult: +Math.min(2.0, k.atrGateMult + 0.25).toFixed(2) }); }
  if (k.atrTpMult != null)  { push({ atrTpMult: +Math.max(1.0, k.atrTpMult - 0.5).toFixed(2) });
                              push({ atrTpMult: +Math.min(5.0, k.atrTpMult + 0.5).toFixed(2) }); }
  if (k.rsiOSBuy != null)   { push({ rsiOSBuy: Math.max(20, k.rsiOSBuy - 5) });
                              push({ rsiOSBuy: Math.min(45, k.rsiOSBuy + 5) }); }
  if (k.rsiOBExit != null)  { push({ rsiOBExit: Math.max(68, k.rsiOBExit - 4) });
                              push({ rsiOBExit: Math.min(88, k.rsiOBExit + 4) }); }
  return out.map(kn => ({ ...kn, tpPct: clampTp(kn.tpPct) }));
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
  const pnlPct = rec.pnlPct ?? ((rec.exitPx / rec.entryPx - 1) * 100 - roundTripCost(rec.cfg || { makerFee: 0.0015, takerFee: 0.0025, spreadEst: 0.0008 }) * 100);
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

// open positions, keyed by symbol — the autopilot's view of what it holds across ticks.
export function loadPositions() { return existsSync(POSITIONS) ? JSON.parse(readFileSync(POSITIONS, 'utf8')) : {}; }
export function savePositions(p) { if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true }); writeFileSync(POSITIONS, JSON.stringify(p, null, 2)); }
export { STATE_DIR, PARAMS };
