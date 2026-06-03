import fs from 'fs';
import { runBacktest } from './engine2.mjs';
process.on('message', ({ name, mpc, opts }) => {
  const all = JSON.parse(fs.readFileSync(`sim/data/${name}.json`, 'utf8'));
  const r = runBacktest(all, { minutesPerCandle: mpc, ...opts });
  process.send({
    strategy_return: r.strategy_return, buy_and_hold_return: r.buy_and_hold_return,
    vs_cash_usdt: r.vs_cash_usdt, vs_bh_usdt: r.vs_bh_usdt, trades: r.trades,
    max_drawdown: r.max_drawdown, family_use: r.family_use,
  });
});
