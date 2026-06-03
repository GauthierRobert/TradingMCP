// Walk-forward adaptive engine ("spot-trade-decision" skill), timeframe-agnostic.
// LONG/FLAT spot only, 0.10% taker fee/fill, decisions every `stepMin` minutes.
// Fully walk-forward: every block re-optimizes on data seen so far, then decides next.
//
// v4 changes (from multi-agent tuning + pattern-detection request):
//   * Tuned defaults: lambda 0.0035, macroMins [120,240,480]  (cuts chop/fee-bleed;
//     validated robust across 7 symbols by the referee subagent).
//   * PATTERN DETECTION layer (usePatterns, default on): trend structure, breakout,
//     and volatility regime are computed at decision time (no lookahead) and used as
//     an entry-confirmation filter, so we only act on real tendencies, not noise.
// ----------------------------------------------------------------------------
// Regime classifier (Step 2 of the skill, made runnable). Causal: only candles
// up to `idx` (default last) are used. Returns the label that selects the mode in
// Step 3 — 'bull' rides, 'bear-capit' stays flat, 'bear-chop'/'chop' run the engine.
export function classifyRegime(candles, minutesPerCandle, idx = candles.length - 1) {
  const close = candles.map(c => c.c), high = candles.map(c => c.h), low = candles.map(c => c.l);
  const toC = (m) => Math.max(1, Math.round(m / minutesPerCandle));
  const emaAt = (span, j) => { const a = 2 / (span + 1); let e = close[0]; for (let i = 1; i <= j; i++) e = a * close[i] + (1 - a) * e; return e; };
  const spans = [120, 240, 480].map(toC), back = toC(120);
  if (idx < spans[2] + back) return 'chop';                         // not enough history
  const now = spans.map(s => emaAt(s, idx)), prev = spans.map(s => emaAt(s, idx - back));
  const allRising = now.every((v, i) => v > prev[i]);
  const allFalling = now.every((v, i) => v < prev[i]);
  const stacked = now[0] > now[1] && now[1] > now[2];               // fast>mid>slow
  // normalized linreg slope over ~120 bars
  const p = Math.min(toC(120), idx); let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (let i = 0; i < p; i++) { const x = i, y = close[idx - p + 1 + i]; sx += x; sy += y; sxy += x * y; sxx += x * x; }
  const slope = ((p * sxy - sx * sy) / (p * sxx - sx * sx)) / close[idx];
  // recent velocity (last ~60 bars) for capitulation detection
  const v60 = close[idx] / close[Math.max(0, idx - toC(60))] - 1;
  if (allRising && stacked && close[idx] > now[2] && slope > 0.0002) return 'bull';
  if (allFalling && close[idx] < now[2]) return v60 < -0.04 ? 'bear-capit' : 'bear-chop';
  return 'chop';
}

export function runBacktest(candles, {
  minutesPerCandle, stepMin = 10, fee = 0.001, startUsdt = 10000,
  lambda = 0.0035,                                   // turnover penalty (tuned up)
  Lmins = [10, 20, 30, 45, 60], kGrid = [0.001, 0.002, 0.004, 0.006],
  macroMins = [120, 240, 480],                       // slower macro gate (tuned)
  usePatterns = false, breakoutMin = 60, trendMin = 120, edgeMargin = 0,
  rideTrend = false,            // when long in a confirmed uptrend, hold until the macro
                                // trend breaks (close < slow EMA) instead of exiting on
                                // small momentum pullbacks — stops bull-market churn.
} = {}) {
  const close = candles.map(c => c.c), high = candles.map(c => c.h), low = candles.map(c => c.l);
  const N = close.length;
  const cpb = Math.max(1, Math.round(stepMin / minutesPerCandle));
  const toC = (m) => Math.max(1, Math.round(m / minutesPerCandle));
  const Nbo = toC(breakoutMin), Ptr = toC(trendMin);

  const emaCache = {};
  const ema = (span) => emaCache[span] ||= (() => {
    const a = 2 / (span + 1), out = new Array(N); out[0] = close[0];
    for (let i = 1; i < N; i++) out[i] = a * close[i] + (1 - a) * out[i - 1];
    return out;
  })();
  const macroBull = (idx, spanC) => {
    if (idx < 2) return false;
    const e = ema(spanC), back = Math.max(0, idx - cpb);
    return close[idx] > e[idx] && e[idx] > e[back];
  };

  // ---------- PATTERN DETECTION (all causal, data <= idx) ----------
  // trend structure via normalized linear-regression slope of close over Ptr bars
  function trendStructure(idx) {
    const p = Math.min(Ptr, idx);
    if (p < 5) return 0;
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (let i = 0; i < p; i++) { const x = i, y = close[idx - p + 1 + i]; sx += x; sy += y; sxy += x * y; sxx += x * x; }
    const slope = (p * sxy - sx * sy) / (p * sxx - sx * sx);
    const norm = slope / close[idx];                 // per-bar % drift
    if (norm > 0.0002) return 1;                     // uptrend
    if (norm < -0.0002) return -1;                   // downtrend
    return 0;                                        // range
  }
  // N-bar breakout: +1 new high, -1 new low, 0 inside range
  function breakout(idx) {
    if (idx - Nbo < 1) return 0;
    let hh = -Infinity, ll = Infinity;
    for (let i = idx - Nbo; i < idx; i++) { if (high[i] > hh) hh = high[i]; if (low[i] < ll) ll = low[i]; }
    if (close[idx] > hh) return 1;
    if (close[idx] < ll) return -1;
    return 0;
  }
  // pattern confirmation for an entry into family `fam` at idx
  function confirmEntry(idx, fam) {
    if (!usePatterns) return true;
    const ts = trendStructure(idx), bo = breakout(idx);
    if (fam === 'trend') return ts >= 0 && bo >= 0 && (bo === 1 || ts === 1); // real strength/breakout
    return ts >= 0;                                  // mr: only buy dips when not in a downtrend
  }

  const nextPos = (idx, pos, cfg) => {
    if (idx - cfg.Lc < 0) return 0;
    const gate = macroBull(idx, cfg.macroC);
    const mom = close[idx] / close[idx - cfg.Lc] - 1;
    if (cfg.fam === 'trend') {
      if (!gate) return 0;
      if (pos === 0) return (mom > cfg.k && confirmEntry(idx, 'trend')) ? 1 : 0;
      if (rideTrend) {                               // bull-only knob (router enables it): trail the
        const e = ema(cfg.macroC);                   // macro trend, hold through noise, exit only
        return close[idx] < e[idx] ? 0 : 1;          // when the trend itself breaks.
      }
      return mom < -cfg.k ? 0 : 1;                   // hysteresis exit (protective; default in chop/bear)
    } else {
      if (pos === 0) return (gate && mom < -cfg.k && confirmEntry(idx, 'mr')) ? 1 : 0;
      return mom > 0 ? 0 : 1;
    }
  };
  const simulate = (endIdx, cfg) => {
    let cash = 1, units = 0, pos = 0, trades = 0;
    for (let t = cpb; t <= endIdx; t += cpb) {
      const di = t - cpb, tgt = nextPos(di, pos, cfg), px = close[di];
      if (tgt !== pos) {
        if (tgt === 1) { units = cash * (1 - fee) / px; cash = 0; }
        else { cash = units * px * (1 - fee); units = 0; } pos = tgt; trades++;
      }
    }
    const last = close[Math.min(endIdx, N - 1)];
    return { equity: cash + units * last * (pos === 1 ? 1 - fee : 1), trades };
  };

  const CFGS = [];
  for (const Lm of Lmins) for (const k of kGrid) for (const mm of macroMins)
    for (const fam of ['trend', 'mr']) CFGS.push({ fam, Lc: toC(Lm), k, macroC: toC(mm), Lm, mm });
  const bestCfg = (endIdx) => {
    let best = null;
    for (const cfg of CFGS) {
      if (endIdx < cfg.Lc + cpb) continue;
      const r = simulate(endIdx, cfg);
      const score = r.equity - lambda * r.trades;
      if (!best || score > best.score) best = { ...r, cfg, score };
    }
    if (!best || best.score <= 1 || best.equity < 1 + edgeMargin) return { cfg: { fam: 'flat' }, score: 1 };
    return best;
  };
  const oracle = () => {
    let cash = 1, units = 0, pos = 0, tr = 0;
    for (let t = cpb; t + cpb < N; t += cpb) {
      const tgt = close[t + cpb] > close[t] ? 1 : 0, px = close[t];
      if (tgt !== pos) { if (tgt === 1) { units = cash * (1 - fee) / px; cash = 0; } else { cash = units * px * (1 - fee); units = 0; } pos = tgt; tr++; }
    }
    const last = close[N - 1];
    return { mult: cash + units * last * (pos === 1 ? 1 - fee : 1), trades: tr };
  };

  let cash = startUsdt, units = 0, pos = 0, totalFees = 0, trades = 0;
  const orders = [], fam = { trend: 0, mr: 0, flat: 0 };
  let peak = startUsdt, maxDD = 0, longBlocks = 0, longWins = 0;
  const eq = (px) => cash + units * px;
  for (let t = cpb; t + cpb < N; t += cpb) {
    const di = t, b = bestCfg(di); fam[b.cfg.fam]++;
    const tgt = b.cfg.fam === 'flat' ? 0 : nextPos(di, pos, b.cfg);
    const pxNow = close[di];
    if (tgt !== pos) {
      const side = tgt === 1 ? 'BUY' : 'SELL'; let f;
      if (tgt === 1) { f = cash * fee; units = (cash - f) / pxNow; cash = 0; }
      else { const pr = units * pxNow; f = pr * fee; cash = pr - f; units = 0; }
      totalFees += f; trades++; pos = tgt;
      orders.push({ minute: Math.round(t * minutesPerCandle), side, price: +pxNow.toFixed(2), fee: +f.toFixed(2),
        fam: b.cfg.fam, Lm: b.cfg.Lm, k: b.cfg.k, mm: b.cfg.mm, eq: +eq(pxNow).toFixed(2) });
    }
    const pxNext = close[di + cpb];
    if (pos === 1) { longBlocks++; if (pxNext > pxNow) longWins++; }
    const e = eq(pxNext); peak = Math.max(peak, e); maxDD = Math.max(maxDD, (peak - e) / peak);
  }
  const lastPx = close[N - 1];
  if (pos === 1) { const pr = units * lastPx, f = pr * fee; cash = pr - f; totalFees += f; trades++; units = 0; }
  const finalEq = cash;
  const firstPx = close[cpb];
  const bh = ((startUsdt * (1 - fee)) / firstPx) * lastPx * (1 - fee);
  const orc = oracle();
  const pct = (x) => ((x / startUsdt - 1) * 100).toFixed(2) + '%';
  return {
    finalEq, strategy_return: pct(finalEq), buy_and_hold_return: pct(bh),
    oracle_return: pct(orc.mult * startUsdt), oracle_trades: orc.trades,
    vs_bh_usdt: +(finalEq - bh).toFixed(2), vs_cash_usdt: +(finalEq - startUsdt).toFixed(2),
    trades, total_fees_usdt: +totalFees.toFixed(2), max_drawdown: (maxDD * 100).toFixed(2) + '%',
    long_blocks: longBlocks, long_hit_rate: longBlocks ? (100 * longWins / longBlocks).toFixed(1) + '%' : 'n/a',
    family_blocks: fam, orders,
  };
}
