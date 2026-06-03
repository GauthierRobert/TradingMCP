// Walk-forward adaptive backtest for BTCUSDT spot (LONG/FLAT, fee-aware).
//
// Loop (exactly as specified):
//   keep first 10 min -> decide position for next 10 min -> place FICTIVE order ->
//   read real next 10 min -> book P&L -> RE-OPTIMIZE algo on all data seen so far ->
//   grow window by 10 min -> repeat until end of 24h window.
//
// No lookahead: the decision for block [t, t+10] uses only candles up to t.
// The re-optimization at step t only sees candles up to t.

import fs from 'fs';

const candles = JSON.parse(fs.readFileSync('sim/k1m.json', 'utf8')); // 1-min OHLCV
const FEE = 0.001;        // 0.10% taker per fill (real takerCommission from getAccount)
const STEP = 10;          // decision cadence, minutes (=10 one-min candles)
const START_USDT = 10000; // starting capital

const close = candles.map(c => c.c);
const N = close.length;

// ---- strategy primitive: momentum over lookback L, go LONG if > theta else FLAT ----
function targetPosition(idx, L, theta) {
  if (idx - L < 0) return 0;                 // not enough history -> FLAT (cash)
  const mom = close[idx] / close[idx - L] - 1;
  return mom > theta ? 1 : 0;                // 1 = hold BTC, 0 = hold USDT
}

// ---- simulate the block strategy over candle indices [0 .. endIdx] in STEP blocks ----
// Returns net-of-fee equity multiple and trade count. Used both for in-sample
// optimization (endIdx = now) and is the same engine as the live walk.
function runStrategy(endIdx, L, theta) {
  let cash = 1, units = 0, pos = 0, trades = 0;
  for (let t = STEP; t <= endIdx; t += STEP) {
    const decideIdx = t - STEP;              // decide using info available at block start
    const tgt = targetPosition(decideIdx, L, theta);
    const px = close[t - STEP];
    if (tgt !== pos) {                        // switch -> pay fee
      if (tgt === 1) { units = cash * (1 - FEE) / px; cash = 0; }
      else { cash = units * px * (1 - FEE); units = 0; }
      pos = tgt; trades++;
    }
    // hold across the block to next boundary (mark-to-market handled by equity calc)
  }
  // liquidate at endIdx for a comparable net figure
  const last = close[Math.min(endIdx, N - 1)];
  const equity = cash + units * last * (pos === 1 ? (1 - FEE) : 1);
  return { equity, trades };
}

// ---- adaptive optimizer: pick (L, theta) maximizing net equity on observed history ----
const GRID_L = [5, 10, 15, 20, 30, 45, 60];
const GRID_THETA = [0, 0.0005, 0.001, 0.002];
function bestParams(endIdx) {
  let best = null;
  for (const L of GRID_L) {
    for (const theta of GRID_THETA) {
      if (endIdx < L + STEP) continue;       // need enough data to evaluate
      const r = runStrategy(endIdx, L, theta);
      // objective: max net equity, tie-break fewer trades (fee discipline)
      const score = r.equity - r.trades * 1e-9;
      if (!best || score > best.score) best = { L, theta, score, ...r };
    }
  }
  return best || { L: 30, theta: 0.001, equity: 1, trades: 0 }; // cold-start default
}

// ============================ LIVE WALK-FORWARD ============================
let cash = START_USDT, units = 0, pos = 0;
let totalFees = 0, trades = 0;
const equityCurve = [];
const fictiveOrders = [];
const paramHistory = [];
let peak = START_USDT, maxDD = 0;
let longBlocks = 0, longWins = 0;

function equityAt(px) { return cash + units * px; }

// first block boundary at t=STEP (we "keep first 10 min", then start deciding)
for (let t = STEP; t + STEP < N; t += STEP) {
  const decideIdx = t;                       // we are now at minute t, decide for [t, t+STEP]
  // --- ADJUST: re-optimize algorithm on ALL data seen so far (up to decideIdx) ---
  const params = bestParams(decideIdx);
  paramHistory.push({ minute: t, L: params.L, theta: params.theta });

  // --- DECIDE next position (fictive order) using only info up to decideIdx ---
  const tgt = targetPosition(decideIdx, params.L, params.theta);
  const pxNow = close[decideIdx];

  if (tgt !== pos) {                          // place FICTIVE order at current price
    const side = tgt === 1 ? 'BUY' : 'SELL';
    let fee;
    if (tgt === 1) { fee = cash * FEE; units = (cash - fee) / pxNow; cash = 0; }
    else { const proceeds = units * pxNow; fee = proceeds * FEE; cash = proceeds - fee; units = 0; }
    totalFees += fee; trades++; pos = tgt;
    fictiveOrders.push({ minute: t, side, price: +pxNow.toFixed(2), feeUSDT: +fee.toFixed(2),
      L: params.L, theta: params.theta, equity: +equityAt(pxNow).toFixed(2) });
  }

  // --- READ REAL next 10 min outcome and book it ---
  const pxNext = close[decideIdx + STEP];
  const blockRet = pxNext / pxNow - 1;
  if (pos === 1) { longBlocks++; if (blockRet > 0) longWins++; }

  const eqEnd = equityAt(pxNext);
  equityCurve.push({ minute: t + STEP, equity: +eqEnd.toFixed(2), pos, px: +pxNext.toFixed(2) });
  peak = Math.max(peak, eqEnd);
  maxDD = Math.max(maxDD, (peak - eqEnd) / peak);
}

// liquidate any open BTC at the final close (pay fee for fairness)
const lastPx = close[N - 1];
if (pos === 1) { const proceeds = units * lastPx; const fee = proceeds * FEE; cash = proceeds - fee; units = 0; totalFees += fee; trades++; }
const finalEquity = cash;

// ---- benchmarks ----
const firstPx = close[STEP];
const bhUnits = (START_USDT * (1 - FEE)) / firstPx;          // buy once at start
const bhFinal = bhUnits * lastPx * (1 - FEE);                // sell once at end
const cashFinal = START_USDT;                                // never trade

const pct = (x) => ((x / START_USDT - 1) * 100).toFixed(2) + '%';

// ---- report ----
const report = {
  window: `${new Date(candles[0].t).toISOString()} -> ${new Date(candles[N-1].ct).toISOString()}`,
  candles_1m: N,
  decision_blocks: equityCurve.length,
  fee_per_fill: (FEE * 100) + '%',
  start_usdt: START_USDT,
  results: {
    strategy_final: +finalEquity.toFixed(2),
    strategy_return: pct(finalEquity),
    buy_and_hold_final: +bhFinal.toFixed(2),
    buy_and_hold_return: pct(bhFinal),
    all_cash_final: cashFinal,
    all_cash_return: '0.00%',
  },
  strategy_vs_bh_usdt: +(finalEquity - bhFinal).toFixed(2),
  trades: trades,
  total_fees_usdt: +totalFees.toFixed(2),
  max_drawdown: (maxDD * 100).toFixed(2) + '%',
  long_blocks: longBlocks,
  long_block_hit_rate: longBlocks ? (100 * longWins / longBlocks).toFixed(1) + '%' : 'n/a',
};

fs.writeFileSync('sim/equity.json', JSON.stringify(equityCurve));
fs.writeFileSync('sim/orders.json', JSON.stringify(fictiveOrders, null, 2));
fs.writeFileSync('sim/report.json', JSON.stringify(report, null, 2));

console.log('================ WALK-FORWARD SIMULATION REPORT ================');
console.log(JSON.stringify(report, null, 2));
console.log('\nFictive orders placed:', fictiveOrders.length);
for (const o of fictiveOrders) {
  console.log(`  min ${String(o.minute).padStart(4)}  ${o.side.padEnd(4)} @ ${o.price}  fee $${o.feeUSDT}  (L=${o.L} th=${o.theta})  eq=$${o.equity}`);
}

// show how the adaptive params evolved (sampled)
console.log('\nAdaptive parameter evolution (every ~60 min):');
for (let i = 0; i < paramHistory.length; i += 6) {
  const p = paramHistory[i];
  console.log(`  min ${String(p.minute).padStart(4)}  L=${p.L}  theta=${p.theta}`);
}
