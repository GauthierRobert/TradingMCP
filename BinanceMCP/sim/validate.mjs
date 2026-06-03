import fs from 'fs';
import { runBacktest } from './engine.mjs';

const k1m = JSON.parse(fs.readFileSync('sim/k1m.json', 'utf8'));
const k5m = JSON.parse(fs.readFileSync('sim/k5m.json', 'utf8'));

function show(name, r) {
  console.log(`\n===== ${name} =====`);
  console.log(`  strategy   : ${r.strategy_return}   (final $${r.finalEq.toFixed(2)})`);
  console.log(`  buy & hold : ${r.buy_and_hold_return}`);
  console.log(`  all cash   : 0.00%`);
  console.log(`  oracle     : ${r.oracle_return}  (ceiling, ${r.oracle_trades} trades perfect foresight)`);
  console.log(`  vs B&H     : +$${r.vs_bh_usdt}   | vs cash: $${r.vs_cash_usdt}`);
  console.log(`  trades ${r.trades}, fees $${r.total_fees_usdt}, maxDD ${r.max_drawdown}, long hit ${r.long_hit_rate}`);
  console.log(`  family blocks:`, r.family_blocks);
}

// down day, high-res
show('BTCUSDT 1m  (today, -6% downtrend, 10-min blocks)',
  runBacktest(k1m, { minutesPerCandle: 1 }));

// 3-day mixed regime (run-up to 71k then fall), 10-min blocks = 2x 5m candles
const r5 = runBacktest(k5m, { minutesPerCandle: 5 });
show('BTCUSDT 5m  (3-day mixed regime, 10-min blocks)', r5);

// also test the 5m engine on just the rising first half to confirm it participates in uptrends
const half = k5m.slice(0, Math.floor(k5m.length / 2));
show('BTCUSDT 5m  (first half = rising leg only)',
  runBacktest(half, { minutesPerCandle: 5 }));
