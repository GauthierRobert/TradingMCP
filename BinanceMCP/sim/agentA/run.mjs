// Entry point for testing the spot-trade-decision skill on a dataset.
// Usage:
//   node sim/run.mjs <datasetName> <minutesPerCandle> [startFrac] [endFrac] [optsJSON]
// e.g.
//   node sim/run.mjs ETHUSDT_5m 5                 # full window, default params
//   node sim/run.mjs ETHUSDT_5m 5 0 0.33          # first third (a local regime)
//   node sim/run.mjs ETHUSDT_5m 5 0 1 '{"lambda":0.0015,"macroMins":[120,240,480]}'
import fs from 'fs';
import { runBacktest } from './engine.mjs';

const [name, mpc, sf = '0', ef = '1', optsJson = '{}'] = process.argv.slice(2);
if (!name || !mpc) { console.error('args: <datasetName> <minutesPerCandle> [startFrac] [endFrac] [optsJSON]'); process.exit(1); }
const all = JSON.parse(fs.readFileSync(`sim/data/${name}.json`, 'utf8'));
const a = Math.floor(+sf * all.length), b = Math.ceil(+ef * all.length);
const candles = all.slice(a, b);
const opts = { minutesPerCandle: +mpc, ...JSON.parse(optsJson) };
const r = runBacktest(candles, opts);
const localChg = ((candles[candles.length - 1].c / candles[0].o - 1) * 100).toFixed(2) + '%';
console.log(JSON.stringify({
  dataset: name, candles: candles.length, slice: `${sf}..${ef}`, window_change: localChg,
  strategy_return: r.strategy_return, buy_and_hold_return: r.buy_and_hold_return,
  all_cash: '0.00%', oracle_return: r.oracle_return, oracle_trades: r.oracle_trades,
  vs_bh_usdt: r.vs_bh_usdt, vs_cash_usdt: r.vs_cash_usdt, trades: r.trades,
  fees_usdt: r.total_fees_usdt, max_drawdown: r.max_drawdown, long_hit_rate: r.long_hit_rate,
  family_blocks: r.family_blocks,
}, null, 2));
