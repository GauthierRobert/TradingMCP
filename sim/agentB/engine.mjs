// Reusable walk-forward adaptive engine (the "skill"), timeframe-agnostic.
// Strategy: macro-gated selector over {trend-follow, mean-reversion, flat},
// re-optimized every block on observed history with a turnover penalty.
// LONG/FLAT spot only, 0.10% taker fee per fill. No lookahead.
export function runBacktest(candles, {
  minutesPerCandle, stepMin = 10, fee = 0.001, startUsdt = 10000, lambda = 0.0008,
  Lmins = [10, 20, 30, 45, 60], kGrid = [0.001, 0.002, 0.004, 0.006],
  macroMins = [60, 120, 240], verbose = false,
  volMult = 0,        // if >0: entry threshold = max(k, volMult * recentVol) (vol-aware hurdle)
  volWinMin = 60,     // lookback (minutes) for realized vol estimate
  trendExitOnGate = false, // if true: trend only exits when momentum<-k AND macro gate fails
} = {}) {
  const close = candles.map(c => c.c);
  const N = close.length;
  const volWinC = Math.max(2, Math.round(volWinMin / minutesPerCandle));
  // realized vol: mean abs step-return over trailing window (cheap, robust)
  const volAt = (idx) => {
    if (!volMult || idx < volWinC + 1) return 0;
    let s = 0, m = 0;
    for (let i = idx - volWinC + 1; i <= idx; i++) { s += Math.abs(close[i] / close[i - 1] - 1); m++; }
    return m ? s / m : 0;
  };
  const cpb = Math.max(1, Math.round(stepMin / minutesPerCandle));     // candles per block
  const toC = (m) => Math.max(1, Math.round(m / minutesPerCandle));     // minutes -> candles

  const emaCache = {};
  const ema = (span) => emaCache[span] ||= (() => {
    const a = 2 / (span + 1), out = new Array(N); out[0] = close[0];
    for (let i = 1; i < N; i++) out[i] = a * close[i] + (1 - a) * out[i - 1];
    return out;
  })();
  const macroBull = (idx, spanC) => {
    if (idx < 2) return false;
    const e = ema(spanC); const back = Math.max(0, idx - cpb);
    return close[idx] > e[idx] && e[idx] > e[back];
  };
  const nextPos = (idx, pos, cfg) => {
    if (idx - cfg.Lc < 0) return 0;
    const gate = macroBull(idx, cfg.macroC);
    const mom = close[idx] / close[idx - cfg.Lc] - 1;
    // vol-aware entry hurdle: in high-vol alts require a bigger edge to enter (cuts whipsaw fee leak)
    const kEnter = volMult ? Math.max(cfg.k, volMult * volAt(idx)) : cfg.k;
    if (cfg.fam === 'trend') {
      if (!gate) return 0;
      if (pos === 0) return mom > kEnter ? 1 : 0;
      // exit: optionally require macro gate to also have failed (hold through shallow dips)
      const wantExit = mom < -cfg.k && (!trendExitOnGate || !gate);
      return wantExit ? 0 : 1;
    } else {
      return pos === 0 ? ((gate && mom < -kEnter) ? 1 : 0) : (mom > 0 ? 0 : 1);
    }
  };
  const simulate = (endIdx, cfg) => {
    let cash = 1, units = 0, pos = 0, trades = 0;
    for (let t = cpb; t <= endIdx; t += cpb) {
      const di = t - cpb, tgt = nextPos(di, pos, cfg), px = close[di];
      if (tgt !== pos) {
        if (tgt === 1) { units = cash * (1 - fee) / px; cash = 0; }
        else { cash = units * px * (1 - fee); units = 0; }
        pos = tgt; trades++;
      }
    }
    const last = close[Math.min(endIdx, N - 1)];
    return { equity: cash + units * last * (pos === 1 ? 1 - fee : 1), trades };
  };

  const CFGS = [];
  for (const Lm of Lmins) for (const k of kGrid) for (const mm of macroMins)
    for (const fam of ['trend', 'mr'])
      CFGS.push({ fam, Lc: toC(Lm), k, macroC: toC(mm), Lm, mm });
  const bestCfg = (endIdx) => {
    let best = null;
    for (const cfg of CFGS) {
      if (endIdx < cfg.Lc + cpb) continue;
      const r = simulate(endIdx, cfg);
      const score = r.equity - lambda * r.trades;
      if (!best || score > best.score) best = { ...r, cfg, score };
    }
    if (!best || best.score <= 1) return { cfg: { fam: 'flat' }, score: 1 };
    return best;
  };
  const oracle = () => {
    let cash = 1, units = 0, pos = 0, tr = 0;
    for (let t = cpb; t + cpb < N; t += cpb) {
      const tgt = close[t + cpb] > close[t] ? 1 : 0, px = close[t];
      if (tgt !== pos) {
        if (tgt === 1) { units = cash * (1 - fee) / px; cash = 0; }
        else { cash = units * px * (1 - fee); units = 0; } pos = tgt; tr++;
      }
    }
    const last = close[N - 1];
    return { mult: cash + units * last * (pos === 1 ? 1 - fee : 1), trades: tr };
  };

  // ---- live walk-forward ----
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
      orders.push({ minute: Math.round(t * minutesPerCandle), side, price: +pxNow.toFixed(2),
        fee: +f.toFixed(2), fam: b.cfg.fam, Lm: b.cfg.Lm, k: b.cfg.k, mm: b.cfg.mm, eq: +eq(pxNow).toFixed(2) });
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
