// Walk-forward adaptive backtest v2 for BTCUSDT spot (LONG/FLAT, fee-aware).
//
// Upgrades over v1 (which lost to fees by overtrading):
//   1. HYSTERESIS  - enter long on mom > entryTh, exit only on mom < -exitTh.
//                    A dead-band between the two => hold through chop, far fewer trades.
//   2. TURNOVER PENALTY in the optimizer - score = equity - lambda*trades, so the
//                    in-sample fit stops chasing noise that fees would eat.
//   3. VOL-SCALED thresholds - entry/exit bands scale with recent realized volatility
//                    (calibrated from the data), so we demand bigger moves when choppy.
//
// Same honest walk-forward: decision for [t,t+10] uses only candles up to t; the
// re-optimization at step t only sees candles up to t. No lookahead.

import fs from 'fs';

const candles = JSON.parse(fs.readFileSync('sim/k1m.json', 'utf8'));
const FEE = 0.001;          // 0.10% taker per fill (real value from getAccount)
const STEP = 10;            // decision cadence (minutes)
const START_USDT = 10000;
const LAMBDA = 0.0010;      // turnover penalty per in-sample trade (~1x fee) in optimizer

const close = candles.map(c => c.c);
const N = close.length;

// rolling realized volatility (stdev of 1-min log returns over last `w`), annualization-free
function vol(idx, w = 60) {
  if (idx - w < 1) return 0.001;
  let s = 0, s2 = 0, n = 0;
  for (let i = idx - w + 1; i <= idx; i++) {
    const r = Math.log(close[i] / close[i - 1]);
    s += r; s2 += r * r; n++;
  }
  const mean = s / n;
  return Math.sqrt(Math.max(1e-12, s2 / n - mean * mean)); // per-minute stdev
}

// stateful signal with hysteresis + vol-scaled bands.
// kEntry/kExit are multipliers on (sqrt(L)*vol) -> bands adapt to horizon & regime.
function nextPos(idx, curPos, L, kEntry, kExit) {
  if (idx - L < 0) return 0;
  const mom = close[idx] / close[idx - L] - 1;
  const band = Math.sqrt(L) * vol(idx);       // expected move scale over L minutes
  const entryTh = kEntry * band;
  const exitTh = kExit * band;
  if (curPos === 0) return mom > entryTh ? 1 : 0;
  return mom < -exitTh ? 0 : 1;               // hold long unless momentum rolls over
}

// run the block strategy over [0..endIdx], net of fees. Used for optimization & live.
function simulate(endIdx, L, kEntry, kExit) {
  let cash = 1, units = 0, pos = 0, trades = 0;
  for (let t = STEP; t <= endIdx; t += STEP) {
    const di = t - STEP;
    const tgt = nextPos(di, pos, L, kEntry, kExit);
    const px = close[di];
    if (tgt !== pos) {
      if (tgt === 1) { units = cash * (1 - FEE) / px; cash = 0; }
      else { cash = units * px * (1 - FEE); units = 0; }
      pos = tgt; trades++;
    }
  }
  const last = close[Math.min(endIdx, N - 1)];
  const equity = cash + units * last * (pos === 1 ? (1 - FEE) : 1);
  return { equity, trades };
}

// adaptive optimizer with turnover penalty (regularized)
const GRID_L = [10, 20, 30, 45, 60, 90];
const GRID_KE = [0.5, 1.0, 1.5, 2.0];        // entry band (in vol units)
const GRID_KX = [0.5, 1.0, 1.5];             // exit band
function bestParams(endIdx) {
  let best = null;
  for (const L of GRID_L)
    for (const kE of GRID_KE)
      for (const kX of GRID_KX) {
        if (endIdx < L + STEP) continue;
        const r = simulate(endIdx, L, kE, kX);
        const score = r.equity - LAMBDA * r.trades;   // regularize turnover
        if (!best || score > best.score) best = { L, kE, kX, score, ...r };
      }
  return best || { L: 30, kE: 1.0, kX: 1.0, equity: 1, trades: 0 };
}

// ============================ LIVE WALK-FORWARD ============================
let cash = START_USDT, units = 0, pos = 0, totalFees = 0, trades = 0;
const equityCurve = [], fictiveOrders = [], paramHistory = [];
let peak = START_USDT, maxDD = 0, longBlocks = 0, longWins = 0;
const equityAt = (px) => cash + units * px;

for (let t = STEP; t + STEP < N; t += STEP) {
  const di = t;
  const params = bestParams(di);                       // ADJUST on all data seen so far
  paramHistory.push({ minute: t, L: params.L, kE: params.kE, kX: params.kX });

  const tgt = nextPos(di, pos, params.L, params.kE, params.kX);   // DECIDE next block
  const pxNow = close[di];
  if (tgt !== pos) {                                   // FICTIVE order
    const side = tgt === 1 ? 'BUY' : 'SELL';
    let fee;
    if (tgt === 1) { fee = cash * FEE; units = (cash - fee) / pxNow; cash = 0; }
    else { const pr = units * pxNow; fee = pr * FEE; cash = pr - fee; units = 0; }
    totalFees += fee; trades++; pos = tgt;
    fictiveOrders.push({ minute: t, side, price: +pxNow.toFixed(2), feeUSDT: +fee.toFixed(2),
      L: params.L, kE: params.kE, kX: params.kX, equity: +equityAt(pxNow).toFixed(2) });
  }

  const pxNext = close[di + STEP];                      // READ real outcome
  const blockRet = pxNext / pxNow - 1;
  if (pos === 1) { longBlocks++; if (blockRet > 0) longWins++; }
  const eqEnd = equityAt(pxNext);
  equityCurve.push({ minute: t + STEP, equity: +eqEnd.toFixed(2), pos });
  peak = Math.max(peak, eqEnd); maxDD = Math.max(maxDD, (peak - eqEnd) / peak);
}

const lastPx = close[N - 1];
if (pos === 1) { const pr = units * lastPx, fee = pr * FEE; cash = pr - fee; units = 0; totalFees += fee; trades++; }
const finalEquity = cash;

const firstPx = close[STEP];
const bhFinal = ((START_USDT * (1 - FEE)) / firstPx) * lastPx * (1 - FEE);
const pct = (x) => ((x / START_USDT - 1) * 100).toFixed(2) + '%';

const report = {
  version: 'v2 (hysteresis + turnover penalty + vol-scaled bands)',
  window: `${new Date(candles[0].t).toISOString()} -> ${new Date(candles[N-1].ct).toISOString()}`,
  decision_blocks: equityCurve.length,
  results: {
    strategy_final: +finalEquity.toFixed(2), strategy_return: pct(finalEquity),
    buy_and_hold_final: +bhFinal.toFixed(2), buy_and_hold_return: pct(bhFinal),
    all_cash_return: '0.00%',
  },
  strategy_vs_bh_usdt: +(finalEquity - bhFinal).toFixed(2),
  strategy_vs_cash_usdt: +(finalEquity - START_USDT).toFixed(2),
  trades, total_fees_usdt: +totalFees.toFixed(2),
  max_drawdown: (maxDD * 100).toFixed(2) + '%',
  long_blocks: longBlocks, long_block_hit_rate: longBlocks ? (100 * longWins / longBlocks).toFixed(1) + '%' : 'n/a',
};

fs.writeFileSync('sim/report2.json', JSON.stringify(report, null, 2));
fs.writeFileSync('sim/orders2.json', JSON.stringify(fictiveOrders, null, 2));
console.log('================ WALK-FORWARD SIMULATION v2 ================');
console.log(JSON.stringify(report, null, 2));
console.log('\nFictive orders:', fictiveOrders.length);
for (const o of fictiveOrders)
  console.log(`  min ${String(o.minute).padStart(4)}  ${o.side.padEnd(4)} @ ${o.price}  fee $${o.feeUSDT}  eq=$${o.equity}`);
