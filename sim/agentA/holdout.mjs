// Out-of-sample holdout sweep on datasets NOT used for tuning.
import fs from 'fs';
const eng = process.argv[2] || './engine.mjs';
const { runBacktest } = await import(eng);
const DS = [['DOGEUSDT_5m', 5], ['SOLUSDT_5m', 5], ['XRPUSDT_5m', 5], ['BNBUSDT_5m', 5], ['DOGEUSDT_1m', 1]];
const SLICES = [[0, 1], [0, 0.25], [0.25, 0.5], [0.5, 0.75], [0.75, 1], [0, 0.33], [0.33, 0.66], [0.66, 1]];
const load = (n) => JSON.parse(fs.readFileSync(`sim/data/${n}.json`, 'utf8'));
const configs = JSON.parse(process.argv[3] || '[{"name":"default","opts":{}}]');
const windows = [];
for (const [name, mpc] of DS) for (const [sf, ef] of SLICES) {
  const all = load(name); const a = Math.floor(sf * all.length), b = Math.ceil(ef * all.length);
  windows.push({ mpc, candles: all.slice(a, b) });
}
const fmt = (x) => (x >= 0 ? '+' : '') + x.toFixed(0);
for (const cfg of configs) {
  let sc = 0, sb = 0, st = 0, worst = 1e9, bc = 0;
  for (const w of windows) {
    const r = runBacktest(w.candles, { minutesPerCandle: w.mpc, ...cfg.opts });
    sc += r.vs_cash_usdt; sb += r.vs_bh_usdt; st += r.trades; worst = Math.min(worst, r.vs_cash_usdt);
    if (r.vs_cash_usdt > 0.01) bc++;
  }
  const n = windows.length;
  console.log(cfg.name.padEnd(24), 'avgVsCash=' + fmt(sc / n).padStart(6), 'avgVsBh=' + fmt(sb / n).padStart(6),
    'tot Trades=' + st, 'worst=' + fmt(worst), 'beatCash=' + bc + '/' + n);
}
