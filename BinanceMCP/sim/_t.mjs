import fs from 'fs';
import { runBacktest } from './engine.mjs';
for (const s of ['BNBUSDT','XRPUSDT','DOGEUSDT']){
  try{
    const c=JSON.parse(fs.readFileSync(`sim/data/${s}_1h_2026ytd.json`,'utf8'));
    const r=runBacktest(c,{minutesPerCandle:60,lambda:0.0035,macroMins:[120,240,480]});
    console.log(s.padEnd(9),'B&H',r.buy_and_hold_return.padStart(8),'strat',r.strategy_return.padStart(8),'vsCash $'+r.vs_cash_usdt,'vsBH $'+r.vs_bh_usdt,'tr',r.trades,'DD',r.max_drawdown);
  }catch(e){console.log(s,'ERROR',e.message);}
}
