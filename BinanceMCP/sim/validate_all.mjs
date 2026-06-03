import fs from 'fs';
import { runBacktest } from './engine.mjs';

const DS = [
  ['BTCUSDT_1m', 1], ['BTCUSDT_5m', 5], ['ETHUSDT_1m', 1], ['ETHUSDT_5m', 5],
  ['DOGEUSDT_1m', 1], ['DOGEUSDT_5m', 5], ['SOLUSDT_5m', 5], ['XRPUSDT_5m', 5], ['BNBUSDT_5m', 5],
];
const load = (n) => JSON.parse(fs.readFileSync(`sim/data/${n}.json`, 'utf8'));

const CONFIGS = {
  'OLD default (v3)': { lambda: 0.0008, macroMins: [60, 120, 240], usePatterns: false },
  'NEW tuned, no patterns': { lambda: 0.0035, macroMins: [120, 240, 480], usePatterns: false },
  'NEW tuned + PATTERNS': { lambda: 0.0035, macroMins: [120, 240, 480], usePatterns: true },
  'NEW + patterns + edgeMargin .008': { lambda: 0.0035, macroMins: [120, 240, 480], usePatterns: true, edgeMargin: 0.008 },
};

for (const [label, opts] of Object.entries(CONFIGS)) {
  let aggCash = 0, aggBh = 0, aggTrades = 0, hurt = 0, worst = 0;
  const rows = [];
  for (const [name, mpc] of DS) {
    const r = runBacktest(load(name), { minutesPerCandle: mpc, ...opts });
    aggCash += r.vs_cash_usdt; aggBh += r.vs_bh_usdt; aggTrades += r.trades;
    if (r.vs_cash_usdt < -10) hurt++;
    worst = Math.min(worst, r.vs_cash_usdt);
    rows.push(`${name.padEnd(12)} strat ${r.strategy_return.padStart(7)}  B&H ${r.buy_and_hold_return.padStart(7)}  vsCash $${String(r.vs_cash_usdt).padStart(7)}  vsBH $${String(r.vs_bh_usdt).padStart(7)}  tr ${r.trades}`);
  }
  console.log(`\n===== ${label} =====`);
  for (const row of rows) console.log('  ' + row);
  console.log(`  ----  AGG vsCash $${aggCash.toFixed(0)}   vsBH $${aggBh.toFixed(0)}   trades ${aggTrades}   hurt(>$10) ${hurt}/9   worst $${worst.toFixed(0)}`);
}
