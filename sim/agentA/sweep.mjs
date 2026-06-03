// Aggregating sweep driver. Usage: node sim/agentA/sweep.mjs <engineRelPath> <configsJSON>
// Runs each config across all datasets+slices, prints aggregate vs_cash$ and vs_bh$.
import fs from 'fs';

const engPath = process.argv[2] || './engine.mjs';
const { runBacktest } = await import(engPath);

const DS = [
  ['BTCUSDT_1m', 1], ['BTCUSDT_5m', 5], ['ETHUSDT_1m', 1], ['ETHUSDT_5m', 5],
];
// full + meaningful slices (quarters + thirds). Each (dataset,slice) is one "window".
const SLICES = [
  [0, 1], [0, 0.25], [0.25, 0.5], [0.5, 0.75], [0.75, 1], [0, 0.33], [0.33, 0.66], [0.66, 1],
];

const cache = {};
const load = (n) => cache[n] ||= JSON.parse(fs.readFileSync(`sim/data/${n}.json`, 'utf8'));

// configs: array of {name, opts}
const configs = JSON.parse(process.argv[3] || '[{"name":"default","opts":{}}]');

const windows = [];
for (const [name, mpc] of DS)
  for (const [sf, ef] of SLICES) {
    const all = load(name);
    const a = Math.floor(sf * all.length), b = Math.ceil(ef * all.length);
    windows.push({ name, mpc, sf, ef, candles: all.slice(a, b) });
  }

const fmt = (x) => (x >= 0 ? '+' : '') + x.toFixed(0);
for (const cfg of configs) {
  let sumCash = 0, sumBh = 0, sumTrades = 0, worst = 1e9, nBeatCash = 0, nBeatBh = 0;
  for (const w of windows) {
    const r = runBacktest(w.candles, { minutesPerCandle: w.mpc, ...cfg.opts });
    sumCash += r.vs_cash_usdt; sumBh += r.vs_bh_usdt; sumTrades += r.trades;
    worst = Math.min(worst, r.vs_cash_usdt);
    if (r.vs_cash_usdt > 0.01) nBeatCash++;
    if (r.vs_bh_usdt > 0.01) nBeatBh++;
  }
  const n = windows.length;
  console.log(
    cfg.name.padEnd(28),
    'avgVsCash=' + fmt(sumCash / n).padStart(6),
    'avgVsBh=' + fmt(sumBh / n).padStart(6),
    'totTrades=' + String(sumTrades).padStart(4),
    'worstWin=' + fmt(worst).padStart(7),
    'beatCash=' + nBeatCash + '/' + n,
    'beatBh=' + nBeatBh + '/' + n,
  );
}
