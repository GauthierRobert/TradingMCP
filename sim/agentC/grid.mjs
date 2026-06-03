// Robustness grid scorer. For each opts combo, run all 7 datasets and report:
// agg vs_cash, agg vs_bh, #datasets hurt (<-10$), worst single vs_cash, BNB capture.
import { runOne } from './harness.mjs';
const base = (await import('../engine.mjs')).runBacktest;
const c = (await import('./engine.mjs')).runBacktest;

const SETS = [
  ['DOGEUSDT_1m', 1], ['DOGEUSDT_5m', 5], ['BTCUSDT_5m', 5], ['ETHUSDT_5m', 5],
  ['SOLUSDT_5m', 5], ['XRPUSDT_5m', 5], ['BNBUSDT_5m', 5],
];

function score(eng, opts) {
  let sc = 0, sbh = 0, hurt = 0, worst = 0, bnb = 0;
  for (const [n, m] of SETS) {
    const r = runOne(eng, n, m, 0, 1, opts);
    sc += r.vs_cash; sbh += r.vs_bh;
    if (r.vs_cash < -10) hurt++;
    worst = Math.min(worst, r.vs_cash);
    if (n === 'BNBUSDT_5m') bnb = r.vs_cash;
  }
  return { sc: +sc.toFixed(1), sbh: +sbh.toFixed(1), hurt, worst: +worst.toFixed(1), bnb: +bnb.toFixed(1) };
}

const combos = JSON.parse(process.argv[2]); // [{label, opts, eng}]
for (const { label, opts, eng } of combos) {
  const s = score(eng === 'c' ? c : base, opts);
  console.log(`${label.padEnd(46)} sc=${String(s.sc).padStart(8)} bh=${String(s.sbh).padStart(8)} hurt=${s.hurt} worst=${String(s.worst).padStart(8)} bnb=${String(s.bnb).padStart(7)}`);
}
