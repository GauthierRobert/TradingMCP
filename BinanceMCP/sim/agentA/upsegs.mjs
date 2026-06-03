// Test a config specifically on genuine local up-segments (where a good strategy
// should PARTICIPATE and beat cash). Usage: node upsegs.mjs <engine> <optsJSON>
import fs from 'fs';
const eng = process.argv[2] || './engine.mjs';
const { runBacktest } = await import(eng);
const opts = JSON.parse(process.argv[3] || '{}');
const load = (n) => JSON.parse(fs.readFileSync(`sim/data/${n}.json`, 'utf8'));
// (dataset, mpc, startFrac, endFrac) segments with positive window_change
const UP = [
  ['BTCUSDT_5m', 5, 0, 0.2], ['ETHUSDT_5m', 5, 0, 0.2], ['ETHUSDT_5m', 5, 0.6, 0.8],
  ['BTCUSDT_1m', 1, 0.7, 0.9], ['ETHUSDT_1m', 1, 0.7, 0.9], ['ETHUSDT_1m', 1, 0.3, 0.5],
];
let sumCash = 0, sumBh = 0;
for (const [n, mpc, sf, ef] of UP) {
  const all = load(n);
  const a = Math.floor(sf * all.length), b = Math.ceil(ef * all.length);
  const c = all.slice(a, b);
  const r = runBacktest(c, { minutesPerCandle: mpc, ...opts });
  const chg = ((c[c.length - 1].c / c[0].o - 1) * 100).toFixed(2);
  sumCash += r.vs_cash_usdt; sumBh += r.vs_bh_usdt;
  console.log(`${n} ${sf}-${ef}`.padEnd(22), 'chg=' + chg + '%',
    'strat=' + r.strategy_return.padStart(7), 'bh=' + r.buy_and_hold_return.padStart(7),
    'vsCash=$' + String(r.vs_cash_usdt).padStart(8), 'tr=' + r.trades);
}
console.log('UP-SEG AVG  vsCash=$' + (sumCash / UP.length).toFixed(1), 'vsBh=$' + (sumBh / UP.length).toFixed(1));
