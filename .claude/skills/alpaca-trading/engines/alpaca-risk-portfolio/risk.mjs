// Risk & portfolio layer (Skill #3). Decides HOW MUCH to deploy and WHEN to stand
// down — venue-agnostic, pure functions, no imports. Pairs with the trend engine
// (alpaca-trend-participation) and the router (alpaca-regime-router).
//
// Three jobs:
//   1) risk-based position sizing — risk a FIXED % of equity per trade given the
//      engine's actual stop distance (so a wide-stop trend trade and a tight-stop
//      FARS trade both risk the same dollars).
//   2) drawdown circuit-breaker — halt NEW entries after equity falls >maxDDStop
//      from its peak; resume only after it recovers within recoverBand of the peak.
//   3) portfolio ranking — score candidate pairs by trend+momentum, penalize by
//      spread/volatility, exclude structural losers, and hand back capped weights.

// ---- 1) Position sizing ----------------------------------------------------
// equity: account equity ($). price: entry px. stopPct: distance to stop as a
// fraction (e.g. trend trail 0.12, FARS stop 0.02). riskPerTradePct: equity
// fraction to risk if the stop hits (default 1%). maxWeight: cap as fraction of
// equity (default 35%). feePct: per-fill fee, folded into the risk budget.
export function riskBasedSize(equity, price, stopPct, {
  riskPerTradePct = 0.01, maxWeight = 0.35, feePct = 0.0025,
} = {}) {
  const riskDollars = equity * riskPerTradePct;
  // loss if stopped = notional * (stopPct + round-trip fee)
  const lossPerDollar = stopPct + 2 * feePct;
  let notional = riskDollars / lossPerDollar;
  const cap = equity * maxWeight;
  const capped = Math.min(notional, cap);
  return {
    notional: +capped.toFixed(2),
    qty: +(capped / price).toFixed(8),
    weight: +(capped / equity).toFixed(4),
    riskDollars: +riskDollars.toFixed(2),
    cappedByMax: notional > cap,
    note: notional > cap ? `wanted $${notional.toFixed(0)} but capped at ${maxWeight*100}% of equity` : `risking ${riskPerTradePct*100}% of equity to a ${stopPct*100}% stop`,
  };
}

// ---- 2) Drawdown circuit-breaker ------------------------------------------
// Given an equity curve (array of numbers), return whether NEW entries are
// allowed at the end, plus the peak/DD/state trail. halted once DD>maxDDStop;
// un-halts only when equity recovers to within recoverBand of the running peak.
export function drawdownBreaker(equityCurve, { maxDDStop = 0.15, recoverBand = 0.03 } = {}) {
  let peak = equityCurve[0], halted = false, haltedBars = 0, maxDD = 0;
  for (const e of equityCurve) {
    if (e > peak) peak = e;
    const dd = (peak - e) / peak;
    maxDD = Math.max(maxDD, dd);
    if (!halted && dd > maxDDStop) halted = true;
    else if (halted && dd <= recoverBand) halted = false;
    if (halted) haltedBars++;
  }
  const last = equityCurve[equityCurve.length - 1];
  const dd = (peak - last) / peak;
  return {
    entriesAllowed: !halted,
    drawdown: +(dd * 100).toFixed(2),
    maxDD: +(maxDD * 100).toFixed(2),
    peak: +peak.toFixed(2),
    haltedBars,
    reason: halted ? `HALTED — ${(dd*100).toFixed(1)}% below peak (>${maxDDStop*100}% stop); resume within ${recoverBand*100}% of peak` : `OK — ${(dd*100).toFixed(1)}% below peak`,
  };
}

// ---- 3) Portfolio ranking --------------------------------------------------
// scores = per-symbol { trend, momentum, volPct, spreadPct } feature bundle.
// Returns ranked list with capped allocation weights; excludes pairs failing the
// floors (down-trend, or cost too high: spread+vol makes the edge unwinnable).
export function rankPairs(features, {
  maxConcurrent = 2, maxWeight = 0.35, minTrend = 0, maxSpreadPct = 0.20,
} = {}) {
  const scored = Object.entries(features).map(([sym, f]) => {
    // risk-adjusted score: trend & momentum reward, vol & spread (cost) penalize.
    const costPenalty = (f.spreadPct + f.volPct * 0.1);
    const score = (f.trend * 100) + (f.momentum * 50) - costPenalty * 10;
    const excluded = f.trend < minTrend || f.spreadPct > maxSpreadPct;
    return { sym, score: +score.toFixed(2), excluded,
      excludeReason: f.trend < minTrend ? 'down/flat trend' : f.spreadPct > maxSpreadPct ? `spread ${f.spreadPct}% > ${maxSpreadPct}%` : null,
      ...f };
  }).sort((a, b) => b.score - a.score);
  const eligible = scored.filter(s => !s.excluded && s.score > 0).slice(0, maxConcurrent);
  const totalScore = eligible.reduce((a, s) => a + s.score, 0) || 1;
  for (const s of scored) {
    const picked = eligible.includes(s);
    s.weight = picked ? +Math.min(maxWeight, s.score / totalScore * (maxConcurrent * maxWeight)).toFixed(4) : 0;
    s.allocate = picked;
  }
  return scored;
}

// Helper: build the feature bundle from candles (causal) for one symbol.
export function featuresFromCandles(candles, spreadPct = 0.08) {
  const close = candles.map(c => c.c), N = close.length;
  const ema = (span) => { const a = 2 / (span + 1); let e = close[0]; for (let i = 1; i < N; i++) e = a * close[i] + (1 - a) * e; return e; };
  const e200now = ema(200);
  const back = Math.max(0, N - 1 - 168);
  let eb = close[0]; const a = 2 / 201; for (let i = 1; i <= back; i++) eb = a * close[i] + (1 - a) * eb;
  const trend = (close[N - 1] / e200now - 1);                 // price vs 200EMA
  const slope = (e200now / eb - 1);                            // 200EMA slope (~1wk)
  const momentum = N > 720 ? (close[N - 1] / close[N - 1 - 720] - 1) : (close[N - 1] / close[0] - 1); // ~30d
  // realized vol: stdev of last 168 hourly returns
  const rets = []; for (let i = N - 168; i < N; i++) if (i > 0) rets.push(close[i] / close[i - 1] - 1);
  const mean = rets.reduce((x, y) => x + y, 0) / rets.length;
  const volPct = +(Math.sqrt(rets.reduce((x, y) => x + (y - mean) ** 2, 0) / rets.length) * 100).toFixed(3);
  return { trend: +trend.toFixed(4), slope: +slope.toFixed(4), momentum: +momentum.toFixed(4), volPct, spreadPct };
}
