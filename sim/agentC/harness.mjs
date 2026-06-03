// Batch harness: run a config across datasets/slices, print compact table.
// Usage: node sim/agentC/harness.mjs '<optsJSON>' [engine] [slicesJSON]
//   engine: 'base' (sim/engine.mjs) or 'c' (sim/agentC/engine.mjs)
import fs from 'fs';

const DATA = (n) => JSON.parse(fs.readFileSync(`sim/data/${n}.json`, 'utf8'));

const ENGINES = {
  base: (await import('../engine.mjs')).runBacktest,
  c: (await import('./engine.mjs')).runBacktest,
};

// dataset, minutesPerCandle
const MAJORS = [
  ['BTCUSDT_5m', 5], ['ETHUSDT_5m', 5], ['SOLUSDT_5m', 5],
  ['XRPUSDT_5m', 5], ['BNBUSDT_5m', 5],
];
const DOGE = [['DOGEUSDT_1m', 1], ['DOGEUSDT_5m', 5]];

export function runOne(runBacktest, name, mpc, sf, ef, opts) {
  const all = DATA(name);
  const a = Math.floor(sf * all.length), b = Math.ceil(ef * all.length);
  const candles = all.slice(a, b);
  const r = runBacktest(candles, { minutesPerCandle: mpc, ...opts });
  const wc = ((candles[candles.length - 1].c / candles[0].o - 1) * 100);
  return {
    label: `${name} ${sf}..${ef}`, name, wc: wc.toFixed(2) + '%',
    strat: r.strategy_return, bh: r.buy_and_hold_return, oracle: r.oracle_return,
    vs_cash: r.vs_cash_usdt, vs_bh: r.vs_bh_usdt, trades: r.trades,
    dd: r.max_drawdown, fees: r.total_fees_usdt,
  };
}

function fmt(rows) {
  const pad = (s, n) => String(s).padEnd(n);
  const padL = (s, n) => String(s).padStart(n);
  console.log([pad('dataset/slice', 22), padL('win_chg', 9), padL('strat', 9), padL('B&H', 9),
    padL('oracle', 9), padL('vs_cash$', 10), padL('vs_bh$', 10), padL('trades', 7), padL('dd', 7)].join(' '));
  let sc = 0, sbh = 0;
  for (const r of rows) {
    console.log([pad(r.label, 22), padL(r.wc, 9), padL(r.strat, 9), padL(r.bh, 9),
      padL(r.oracle, 9), padL(r.vs_cash, 10), padL(r.vs_bh, 10), padL(r.trades, 7), padL(r.dd, 7)].join(' '));
    sc += r.vs_cash; sbh += r.vs_bh;
  }
  console.log('AGG vs_cash$=' + sc.toFixed(2) + '  vs_bh$=' + sbh.toFixed(2));
  return { sc, sbh };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('harness.mjs')) {
  const opts = JSON.parse(process.argv[2] || '{}');
  const eng = ENGINES[process.argv[3] || 'base'];
  const slicesArg = process.argv[4];
  let targets;
  if (slicesArg) {
    targets = JSON.parse(slicesArg); // [[name,mpc,sf,ef],...]
  } else {
    targets = [...DOGE, ...MAJORS].map(([n, m]) => [n, m, 0, 1]);
  }
  const rows = targets.map(([n, m, sf = 0, ef = 1]) => runOne(eng, n, m, sf, ef, opts));
  fmt(rows);
}
