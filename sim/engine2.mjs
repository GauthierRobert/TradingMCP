// engine2 — bear-market / small-variation capture for LONG-FLAT spot.
//
// Motivation: the v4 engine (engine.mjs) gates entries behind a macro-bull EMA stack,
// so in a downtrend it sits FLAT and returns ~0%. The question this engine answers:
// can we still MAKE money in a bear market by buying small dips and selling small
// bounces (mean reversion / range fade) on broader timeframes (15m, 1h), net of fees?
//
// Still walk-forward (no lookahead): every `reoptEvery` blocks we re-pick the best
// config on a rolling in-sample window, then trade the next blocks with it.
// Long/flat only, taker fee per fill. Adds MR/range families + TP/SL/time-stop risk
// controls that a trend-follower lacks (so a dip-buy doesn't ride a knife to zero).
//
// Strategy families:
//   trend  : long if mom(L) > k (macro-bull gated)              — the v4 behaviour
//   mr_z   : buy when zscore(W) < -zEntry; exit on revert (z>-zExit) or TP/SL/time
//   rsi    : buy when RSI(p) < buyTh;  exit when RSI > sellTh or TP/SL/time
//   bb     : buy below lower Bollinger (mean - mult*std); exit at mean or TP/SL/time
//   donch  : buy within tol of N-bar low; exit at/above mid or N-bar high or TP/SL/time
//   flat   : stay in quote
//
// MR/range families are NOT macro-bull gated by default (that's the whole point — they
// must work while the macro trend is down). A `mrDownOnly` flag can restrict them to
// only fire when the slow trend is DOWN (pure bear-bounce mode) for ablation.

export function runBacktest(candles, opts = {}) {
  const {
    minutesPerCandle,
    stepMin = minutesPerCandle,           // decide every bar by default on broad TFs
    fee = 0.001, startUsdt = 10000,
    lambda = 0.0035,                       // turnover penalty in the selector score
    reoptEvery = 24,                       // re-optimise the config every N blocks
    insampleBars = 1500,                   // rolling in-sample lookback (bars), 0 = all
    families = ['trend', 'mr_z', 'rsi', 'bb', 'donch'],
    // grids (minutes where natural; converted to bars internally)
    Lmins = [30, 60, 120, 240],            // trend momentum lookbacks
    kGrid = [0.002, 0.004, 0.008],         // trend threshold
    macroMins = [240, 480, 960],           // macro-bull EMA gate for trend
    zWinMins = [120, 240, 480],            // mean-rev window
    zEntryGrid = [1.5, 2.0, 2.5],          // buy when z below -zEntry
    zExitGrid = [0.0, 0.5],                // exit when z above -zExit (toward mean)
    rsiPerMins = [120, 240],               // RSI period (in minutes -> bars)
    rsiBuy = [25, 30, 35], rsiSell = [50, 55, 60],
    bbWinMins = [120, 240], bbMult = [2.0, 2.5],
    donchMins = [240, 480], donchTol = [0.0, 0.003],
    // risk controls applied to MR/range families (fractions); null = disabled
    tpGrid = [null, 0.01, 0.02], slGrid = [null, 0.03, 0.05], maxHoldMins = [null, 1440],
    mrDownOnly = false,                    // restrict MR families to fire only in down-trend
    // ---- hypothesis toggles (global, not part of the grid) ----
    entryConfirm = 'none',                 // 'none' | 'turnup' | 'emaReclaim' : require the
                                           //   dip to be TURNING UP before buying (buy the
                                           //   reversal, not the falling knife).
    confEmaMins = 60,                      // EMA span for 'emaReclaim' confirmation
    declWinMins = 240, declMax = null,     // free-fall gate: block MR entries when the return
                                           //   over declWin bars is below -declMax (null=off)
    edgeMargin = 0,                        // selector requires in-sample equity > 1 + edgeMargin
  } = opts;

  const close = candles.map(c => c.c), high = candles.map(c => c.h), low = candles.map(c => c.l);
  const N = close.length;
  const cpb = Math.max(1, Math.round(stepMin / minutesPerCandle));
  const toC = (m) => Math.max(1, Math.round(m / minutesPerCandle));

  // ---------- precomputed indicators (cached by parameter) ----------
  const emaCache = {};
  const ema = (span) => emaCache[span] ||= (() => {
    const a = 2 / (span + 1), out = new Array(N); out[0] = close[0];
    for (let i = 1; i < N; i++) out[i] = a * close[i] + (1 - a) * out[i - 1];
    return out;
  })();
  // rolling mean & std over W bars via prefix sums -> O(N) per W
  const msCache = {};
  const meanStd = (W) => msCache[W] ||= (() => {
    const mean = new Array(N), std = new Array(N);
    let s = 0, s2 = 0;
    for (let i = 0; i < N; i++) {
      s += close[i]; s2 += close[i] * close[i];
      if (i >= W) { s -= close[i - W]; s2 -= close[i - W] * close[i - W]; }
      const n = Math.min(i + 1, W), m = s / n;
      mean[i] = m; std[i] = Math.sqrt(Math.max(1e-12, s2 / n - m * m));
    }
    return { mean, std };
  })();
  // Wilder RSI over period p -> O(N) per p
  const rsiCache = {};
  const rsi = (p) => rsiCache[p] ||= (() => {
    const out = new Array(N).fill(50); let ag = 0, al = 0;
    for (let i = 1; i < N; i++) {
      const d = close[i] - close[i - 1], up = Math.max(0, d), dn = Math.max(0, -d);
      if (i <= p) { ag += up; al += dn; if (i === p) { ag /= p; al /= p; out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); } }
      else { ag = (ag * (p - 1) + up) / p; al = (al * (p - 1) + dn) / p; out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); }
    }
    return out;
  })();
  // rolling high/low over W bars (for donchian & macro down)
  const hlCache = {};
  const rollHL = (W) => hlCache[W] ||= (() => {
    const hh = new Array(N), ll = new Array(N);
    for (let i = 0; i < N; i++) {
      let h = -Infinity, l = Infinity; const a = Math.max(0, i - W + 1);
      for (let j = a; j <= i; j++) { if (high[j] > h) h = high[j]; if (low[j] < l) l = low[j]; }
      hh[i] = h; ll[i] = l;
    }
    return { hh, ll };
  })();

  const macroBull = (idx, spanC) => {
    if (idx < 2) return false;
    const e = ema(spanC), back = Math.max(0, idx - cpb);
    return close[idx] > e[idx] && e[idx] > e[back];
  };
  const macroDown = (idx, spanC) => {
    if (idx < 2) return false;
    const e = ema(spanC), back = Math.max(0, idx - cpb);
    return close[idx] < e[idx] && e[idx] < e[back];
  };
  const confEmaC = toC(confEmaMins), declWinC = toC(declWinMins);
  // shared MR entry confirmation: is the dip turning up + not in free-fall?
  const mrEntryOK = (idx) => {
    if (declMax != null) {
      const j = idx - declWinC;
      if (j >= 0 && close[idx] / close[j] - 1 < -declMax) return false; // falling too fast
    }
    if (entryConfirm === 'turnup') return idx >= cpb && close[idx] > close[idx - cpb];
    if (entryConfirm === 'emaReclaim') return close[idx] > ema(confEmaC)[idx];
    return true;
  };

  // decide desired target position (0/1) for a config given current pos & entry context.
  // returns {tgt, reason}
  const decide = (idx, pos, entryPx, heldBars, cfg) => {
    const fam = cfg.fam;
    if (fam === 'flat') return 0;
    if (fam === 'trend') {
      if (idx - cfg.Lc < 0) return 0;
      const gate = macroBull(idx, cfg.macroC);
      const mom = close[idx] / close[idx - cfg.Lc] - 1;
      if (pos === 0) return (gate && mom > cfg.k) ? 1 : 0;
      return mom < -cfg.k ? 0 : 1;           // hysteresis exit
    }
    // ---- MR / range families share TP/SL/time-stop exit logic ----
    if (pos === 1) {
      const ret = close[idx] / entryPx - 1;
      if (cfg.tp != null && ret >= cfg.tp) return 0;
      if (cfg.sl != null && ret <= -cfg.sl) return 0;
      if (cfg.maxHoldC != null && heldBars >= cfg.maxHoldC) return 0;
    }
    if (fam === 'mr_z') {
      const { mean, std } = meanStd(cfg.W);
      const z = (close[idx] - mean[idx]) / std[idx];
      if (pos === 0) {
        if (mrDownOnly && !macroDown(idx, cfg.W)) return 0;
        return (z < -cfg.zEntry && mrEntryOK(idx)) ? 1 : 0;
      }
      return z > -cfg.zExit ? 0 : 1;         // exit when reverted toward/above mean
    }
    if (fam === 'rsi') {
      const r = rsi(cfg.p)[idx];
      if (pos === 0) {
        if (mrDownOnly && !macroDown(idx, cfg.p)) return 0;
        return (r < cfg.buy && mrEntryOK(idx)) ? 1 : 0;
      }
      return r > cfg.sell ? 0 : 1;
    }
    if (fam === 'bb') {
      const { mean, std } = meanStd(cfg.W);
      const lower = mean[idx] - cfg.mult * std[idx];
      if (pos === 0) {
        if (mrDownOnly && !macroDown(idx, cfg.W)) return 0;
        return (close[idx] < lower && mrEntryOK(idx)) ? 1 : 0;
      }
      return close[idx] >= mean[idx] ? 0 : 1; // exit at the mean
    }
    if (fam === 'donch') {
      const { hh, ll } = rollHL(cfg.W);
      const range = hh[idx] - ll[idx];
      if (range <= 0) return pos;
      const loZone = ll[idx] + cfg.tol * close[idx];
      const mid = (hh[idx] + ll[idx]) / 2;
      if (pos === 0) {
        if (mrDownOnly && !macroDown(idx, cfg.W)) return 0;
        return (close[idx] <= loZone && mrEntryOK(idx)) ? 1 : 0;
      }
      return close[idx] >= mid ? 0 : 1;       // exit at range mid
    }
    return 0;
  };

  // simulate a config over [lo..hi] (bar indices, stepping cpb). Returns {equity,trades}.
  const simulate = (lo, hi, cfg) => {
    let cash = 1, units = 0, pos = 0, trades = 0, entryPx = 0, entryT = 0;
    for (let t = lo; t <= hi; t += cpb) {
      const heldBars = pos === 1 ? (t - entryT) : 0;
      const tgt = decide(t, pos, entryPx, heldBars, cfg);
      const px = close[t];
      if (tgt !== pos) {
        if (tgt === 1) { units = cash * (1 - fee) / px; cash = 0; entryPx = px; entryT = t; }
        else { cash = units * px * (1 - fee); units = 0; }
        pos = tgt; trades++;
      }
    }
    const last = close[Math.min(hi, N - 1)];
    return { equity: cash + units * last * (pos === 1 ? 1 - fee : 1), trades };
  };

  // build config list
  const CFGS = [];
  for (const fam of families) {
    if (fam === 'trend') {
      for (const Lm of Lmins) for (const k of kGrid) for (const mm of macroMins)
        CFGS.push({ fam, Lc: toC(Lm), k, macroC: toC(mm), tag: `trend L${Lm} k${k} m${mm}` });
    } else if (fam === 'mr_z') {
      for (const W of zWinMins) for (const ze of zEntryGrid) for (const zx of zExitGrid)
        for (const tp of tpGrid) for (const sl of slGrid) for (const mh of maxHoldMins)
          CFGS.push({ fam, W: toC(W), zEntry: ze, zExit: zx, tp, sl, maxHoldC: mh == null ? null : toC(mh), tag: `mrz W${W} e${ze} x${zx} tp${tp} sl${sl}` });
    } else if (fam === 'rsi') {
      for (const pm of rsiPerMins) for (const b of rsiBuy) for (const s of rsiSell)
        for (const tp of tpGrid) for (const sl of slGrid) for (const mh of maxHoldMins)
          CFGS.push({ fam, p: toC(pm), buy: b, sell: s, tp, sl, maxHoldC: mh == null ? null : toC(mh), tag: `rsi p${pm} b${b} s${s} tp${tp} sl${sl}` });
    } else if (fam === 'bb') {
      for (const W of bbWinMins) for (const m of bbMult)
        for (const tp of tpGrid) for (const sl of slGrid) for (const mh of maxHoldMins)
          CFGS.push({ fam, W: toC(W), mult: m, tp, sl, maxHoldC: mh == null ? null : toC(mh), tag: `bb W${W} m${m} tp${tp} sl${sl}` });
    } else if (fam === 'donch') {
      for (const W of donchMins) for (const tol of donchTol)
        for (const tp of tpGrid) for (const sl of slGrid) for (const mh of maxHoldMins)
          CFGS.push({ fam, W: toC(W), tol, tp, sl, maxHoldC: mh == null ? null : toC(mh), tag: `donch W${W} tol${tol} tp${tp} sl${sl}` });
    } else if (fam === 'flat') {
      CFGS.push({ fam: 'flat', tag: 'flat' });
    }
  }

  const bestCfg = (endIdx) => {
    const lo = insampleBars > 0 ? Math.max(cpb, endIdx - insampleBars) : cpb;
    let best = null;
    for (const cfg of CFGS) {
      const r = simulate(lo, endIdx, cfg);
      const score = r.equity - lambda * r.trades;
      if (!best || score > best.score) best = { ...r, cfg, score };
    }
    // require the in-sample winner to actually beat sitting flat by edgeMargin
    if (!best || best.equity <= 1.0 + edgeMargin) return { cfg: { fam: 'flat' }, score: 1 };
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

  // ---------- walk-forward live run ----------
  let cash = startUsdt, units = 0, pos = 0, totalFees = 0, trades = 0, entryPx = 0, entryT = 0;
  const orders = [], famUse = {};
  let peak = startUsdt, maxDD = 0;
  let curCfg = { fam: 'flat' };
  const eq = (px) => cash + units * px;

  let blk = 0;
  for (let t = cpb; t + cpb < N; t += cpb, blk++) {
    if (blk % reoptEvery === 0) { const b = bestCfg(t); curCfg = b.cfg; }
    famUse[curCfg.fam] = (famUse[curCfg.fam] || 0) + 1;
    const heldBars = pos === 1 ? (t - entryT) : 0;
    const tgt = decide(t, pos, entryPx, heldBars, curCfg);
    const pxNow = close[t];
    if (tgt !== pos) {
      const side = tgt === 1 ? 'BUY' : 'SELL'; let f;
      if (tgt === 1) { f = cash * fee; units = (cash - f) / pxNow; cash = 0; entryPx = pxNow; entryT = t; }
      else { const pr = units * pxNow; f = pr * fee; cash = pr - f; units = 0; }
      totalFees += f; trades++; pos = tgt;
      orders.push({ minute: Math.round(t * minutesPerCandle), side, price: +pxNow.toFixed(4), fee: +f.toFixed(2), fam: curCfg.fam, tag: curCfg.tag, eq: +eq(pxNow).toFixed(2) });
    }
    const pxNext = close[t + cpb];
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
    family_use: famUse, orders,
  };
}
