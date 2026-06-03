// Walk-forward adaptive backtest v3 for BTCUSDT spot (LONG/FLAT, fee-aware).
//
// New idea after v1/v2 both lost to fees/whipsaw on the downtrend:
//   * MACRO REGIME GATE: never hold BTC unless price is above a slow EMA (uptrend).
//     This is what keeps us in USDT through the persistent down-legs.
//   * STRATEGY SELECTOR: the optimizer chooses, per step, the best of several
//     candidate configs across TWO families - trend-follow and mean-reversion -
//     plus always-flat, scored by net-of-fee equity minus a turnover penalty.
//   * ORACLE CEILING: we also compute the perfect-foresight long/flat result to
//     know the achievable ceiling for this window.
//
// Honest walk-forward: every decision for [t,t+10] uses only candles up to t.

import fs from 'fs';

const candles = JSON.parse(fs.readFileSync('sim/k1m.json', 'utf8'));
const FEE = 0.001, STEP = 10, START_USDT = 10000, LAMBDA = 0.0008;
const close = candles.map(c => c.c);
const N = close.length;

// ---- precompute EMAs for macro gate spans ----
function ema(span) {
  const a = 2 / (span + 1), out = new Array(N);
  out[0] = close[0];
  for (let i = 1; i < N; i++) out[i] = a * close[i] + (1 - a) * out[i - 1];
  return out;
}
const EMAS = { 30: ema(30), 60: ema(60), 120: ema(120), 240: ema(240) };

function macroBull(idx, span) {            // uptrend if price above EMA and EMA rising
  const e = EMAS[span];
  if (idx < 2) return false;
  return close[idx] > e[idx] && e[idx] > e[idx - 5 < 0 ? 0 : idx - 5];
}

// ---- signal: returns desired position (1 long / 0 flat), stateful for hysteresis ----
// cfg = {fam:'trend'|'mr', L, k, macro}
function nextPos(idx, pos, cfg) {
  if (idx - cfg.L < 0) return 0;
  const gate = macroBull(idx, cfg.macro);
  const mom = close[idx] / close[idx - cfg.L] - 1;
  if (cfg.fam === 'trend') {
    if (!gate) return 0;                   // macro down -> force flat
    if (pos === 0) return mom > cfg.k ? 1 : 0;
    return mom < -cfg.k ? 0 : 1;           // hysteresis exit
  } else { // mean-reversion: buy oversold dips, but only when macro not bearish
    if (pos === 0) return (gate && mom < -cfg.k) ? 1 : 0;  // dip inside an uptrend
    return mom > 0 ? 0 : 1;                // exit once it has reverted up
  }
}

function simulate(endIdx, cfg) {
  let cash = 1, units = 0, pos = 0, trades = 0;
  for (let t = STEP; t <= endIdx; t += STEP) {
    const di = t - STEP, tgt = nextPos(di, pos, cfg), px = close[di];
    if (tgt !== pos) {
      if (tgt === 1) { units = cash * (1 - FEE) / px; cash = 0; }
      else { cash = units * px * (1 - FEE); units = 0; }
      pos = tgt; trades++;
    }
  }
  const last = close[Math.min(endIdx, N - 1)];
  return { equity: cash + units * last * (pos === 1 ? (1 - FEE) : 1), trades };
}

// candidate config space (trend + mean-reversion families)
const CFGS = [];
for (const L of [10, 20, 30, 45, 60])
  for (const k of [0.001, 0.002, 0.004, 0.006])
    for (const macro of [60, 120, 240]) {
      CFGS.push({ fam: 'trend', L, k, macro });
      CFGS.push({ fam: 'mr', L, k, macro });
    }

function bestCfg(endIdx) {
  let best = null, flat = { equity: 1, trades: 0, cfg: { fam: 'flat' } };
  for (const cfg of CFGS) {
    if (endIdx < cfg.L + STEP) continue;
    const r = simulate(endIdx, cfg);
    const score = r.equity - LAMBDA * r.trades;
    if (!best || score > best.score) best = { ...r, cfg, score };
  }
  // always-flat is a valid choice; pick it if nothing beats it net of penalty
  if (!best || best.score <= flat.equity) return { ...flat, score: flat.equity };
  return best;
}

// ---- ORACLE: perfect foresight long/flat, paying fees on switches ----
function oracle() {
  let cash = 1, units = 0, pos = 0, trades = 0;
  for (let t = STEP; t + STEP < N; t += STEP) {
    const up = close[t + STEP] > close[t];          // will next block rise?
    const tgt = up ? 1 : 0, px = close[t];
    if (tgt !== pos) {
      if (tgt === 1) { units = cash * (1 - FEE) / px; cash = 0; }
      else { cash = units * px * (1 - FEE); units = 0; }
      pos = tgt; trades++;
    }
  }
  const last = close[N - 1];
  return { mult: cash + units * last * (pos === 1 ? (1 - FEE) : 1), trades };
}

// ============================ LIVE WALK-FORWARD ============================
let cash = START_USDT, units = 0, pos = 0, totalFees = 0, trades = 0;
const fictiveOrders = [], famUse = { trend: 0, mr: 0, flat: 0 };
let peak = START_USDT, maxDD = 0, longBlocks = 0, longWins = 0;
const equityAt = (px) => cash + units * px;

for (let t = STEP; t + STEP < N; t += STEP) {
  const di = t;
  const b = bestCfg(di);                              // ADJUST: re-select strategy+params
  famUse[b.cfg.fam]++;
  const tgt = b.cfg.fam === 'flat' ? 0 : nextPos(di, pos, b.cfg);  // DECIDE
  const pxNow = close[di];
  if (tgt !== pos) {                                  // FICTIVE order
    const side = tgt === 1 ? 'BUY' : 'SELL';
    let fee;
    if (tgt === 1) { fee = cash * FEE; units = (cash - fee) / pxNow; cash = 0; }
    else { const pr = units * pxNow; fee = pr * FEE; cash = pr - fee; units = 0; }
    totalFees += fee; trades++; pos = tgt;
    fictiveOrders.push({ minute: t, side, price: +pxNow.toFixed(2), fee: +fee.toFixed(2),
      fam: b.cfg.fam, L: b.cfg.L, k: b.cfg.k, macro: b.cfg.macro, eq: +equityAt(pxNow).toFixed(2) });
  }
  const pxNext = close[di + STEP];
  if (pos === 1) { longBlocks++; if (pxNext > pxNow) longWins++; }
  const eqEnd = equityAt(pxNext);
  peak = Math.max(peak, eqEnd); maxDD = Math.max(maxDD, (peak - eqEnd) / peak);
}
const lastPx = close[N - 1];
if (pos === 1) { const pr = units * lastPx, fee = pr * FEE; cash = pr - fee; totalFees += fee; trades++; units = 0; }
const finalEquity = cash;

const firstPx = close[STEP];
const bhFinal = ((START_USDT * (1 - FEE)) / firstPx) * lastPx * (1 - FEE);
const orc = oracle();
const pct = (x) => ((x / START_USDT - 1) * 100).toFixed(2) + '%';

const report = {
  version: 'v3 (macro-gated strategy selector: trend | mean-rev | flat)',
  decision_blocks: Math.floor((N - 2 * STEP) / STEP) + 1,
  results: {
    strategy_return: pct(finalEquity), strategy_final: +finalEquity.toFixed(2),
    buy_and_hold_return: pct(bhFinal), all_cash_return: '0.00%',
    oracle_ceiling_return: pct(orc.mult * START_USDT) + ` (${orc.trades} trades, perfect foresight)`,
  },
  strategy_vs_bh_usdt: +(finalEquity - bhFinal).toFixed(2),
  strategy_vs_cash_usdt: +(finalEquity - START_USDT).toFixed(2),
  trades, total_fees_usdt: +totalFees.toFixed(2),
  max_drawdown: (maxDD * 100).toFixed(2) + '%',
  long_blocks: longBlocks, long_hit_rate: longBlocks ? (100 * longWins / longBlocks).toFixed(1) + '%' : 'n/a',
  family_selected_blocks: famUse,
};
fs.writeFileSync('sim/report3.json', JSON.stringify(report, null, 2));
console.log('================ WALK-FORWARD SIMULATION v3 ================');
console.log(JSON.stringify(report, null, 2));
console.log('\nFictive orders:', fictiveOrders.length);
for (const o of fictiveOrders)
  console.log(`  min ${String(o.minute).padStart(4)}  ${o.side.padEnd(4)} @ ${o.price}  fee $${o.fee}  [${o.fam} L=${o.L} k=${o.k} macro=${o.macro}]  eq=$${o.eq}`);
