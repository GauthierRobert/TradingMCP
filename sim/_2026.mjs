import fs from 'fs';
import { runBacktest, classifyRegime } from './engine.mjs';
const load = n => JSON.parse(fs.readFileSync(`sim/data/${n}.json`,'utf8'));

// BTC monthly path (1d)
const d = load('BTCUSDT_1d_2026ytd');
console.log('=== BTC 2026 monthly path (daily closes) ===');
let mlabel='', mstart=null, prev=null;
for (const c of d){ const m = new Date(c.t).toISOString().slice(0,7); if(m!==mlabel){ if(mstart!=null) console.log(`  ${mlabel}: ${((prev/mstart-1)*100).toFixed(1)}%`); mlabel=m; mstart=c.o;} prev=c.c;}
console.log(`  ${mlabel}: ${((prev/mstart-1)*100).toFixed(1)}%`);

// Engine on 2026 YTD, 1h, all symbols
const base = { lambda:0.0035, macroMins:[120,240,480] };
console.log('\n=== Engine on 2026 YTD (1h), default tuned config ===');
console.log('symbol      regime(40%)  B&H       strat     vsCash    vsBH      trades  maxDD');
let aggCash=0,aggBh=0;
for (const s of ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT']){
  const c = load(`${s}_1h_2026ytd`);
  const reg = classifyRegime(c.slice(0,Math.floor(c.length*0.4)),60);
  const r = runBacktest(c,{minutesPerCandle:60,...base});
  aggCash+=r.vs_cash_usdt; aggBh+=r.vs_bh_usdt;
  console.log(`${s.padEnd(11)} ${reg.padEnd(11)} ${r.buy_and_hold_return.padStart(8)} ${r.strategy_return.padStart(8)}  $${String(r.vs_cash_usdt).padStart(7)}  $${String(r.vs_bh_usdt).padStart(7)}  ${String(r.trades).padStart(4)}   ${r.max_drawdown}`);
}
console.log(`AGG vsCash $${aggCash.toFixed(0)}   vsBH $${aggBh.toFixed(0)}`);
