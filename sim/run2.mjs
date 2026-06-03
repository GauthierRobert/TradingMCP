// node sim/run2.mjs <datasetName> <minutesPerCandle> [startFrac endFrac] [optsJSON]
import fs from 'fs';
import { runBacktest } from './engine2.mjs';

const [name, mpc, sf = '0', ef = '1', optsJson = '{}'] = process.argv.slice(2);
if (!name || !mpc) { console.error('args: <datasetName> <minutesPerCandle> [startFrac endFrac] [optsJSON]'); process.exit(1); }
const all = JSON.parse(fs.readFileSync(`sim/data/${name}.json`, 'utf8'));
const a = Math.floor(+sf * all.length), b = Math.ceil(+ef * all.length);
const candles = all.slice(a, b);
const t0 = Date.now();
const r = runBacktest(candles, { minutesPerCandle: +mpc, ...JSON.parse(optsJson) });
const ms = Date.now() - t0;
const localChg = ((candles[candles.length - 1].c / candles[0].o - 1) * 100).toFixed(2) + '%';
console.log(JSON.stringify({
  dataset: name, candles: candles.length, slice: `${sf}..${ef}`, window_change: localChg,
  strategy_return: r.strategy_return, buy_and_hold_return: r.buy_and_hold_return, all_cash: '0.00%',
  oracle_return: r.oracle_return, vs_bh_usdt: r.vs_bh_usdt, vs_cash_usdt: r.vs_cash_usdt,
  trades: r.trades, fees_usdt: r.total_fees_usdt, max_drawdown: r.max_drawdown,
  family_use: r.family_use, elapsed_ms: ms,
}, null, 2));
