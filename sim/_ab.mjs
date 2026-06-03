import fs from 'fs';
import { runBacktest } from './engine.mjs';
const DS = [['BTCUSDT_1m',1],['BTCUSDT_5m',5],['ETHUSDT_1m',1],['ETHUSDT_5m',5],['DOGEUSDT_1m',1],['DOGEUSDT_5m',5],['SOLUSDT_5m',5],['XRPUSDT_5m',5],['BNBUSDT_5m',5]];
const load = n => JSON.parse(fs.readFileSync(`sim/data/${n}.json`,'utf8'));
const base = {lambda:0.0035, macroMins:[120,240,480], usePatterns:false};
for (const [label, opts] of [['NEW tuned', base],['NEW tuned + rideTrend', {...base, rideTrend:true}]]){
  let aggCash=0,aggBh=0,aggTr=0,hurt=0,worst=0;const rows=[];
  for (const [n,mpc] of DS){const r=runBacktest(load(n),{minutesPerCandle:mpc,...opts});aggCash+=r.vs_cash_usdt;aggBh+=r.vs_bh_usdt;aggTr+=r.trades;if(r.vs_cash_usdt<-10)hurt++;worst=Math.min(worst,r.vs_cash_usdt);rows.push(`  ${n.padEnd(12)} vsCash $${String(r.vs_cash_usdt).padStart(7)}  vsBH $${String(r.vs_bh_usdt).padStart(7)}  tr ${r.trades}`);}
  console.log(`\n== ${label} ==`);rows.forEach(x=>console.log(x));
  console.log(`  -- AGG vsCash $${aggCash.toFixed(0)}  vsBH $${aggBh.toFixed(0)}  trades ${aggTr}  hurt ${hurt}/9  worst $${worst.toFixed(0)}`);
}
