// Canonical 2026 validation for the spot-trade-decision skill.
// Real Binance data, 2026-01-01 -> 2026-06-03 (fetched via sim/fetch.mjs).
import fs from 'fs';
import { runBacktest, classifyRegime } from './engine.mjs';
const load = n => JSON.parse(fs.readFileSync(`sim/data/${n}.json`,'utf8'));
const SYMS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT'];
const base = { lambda:0.0035, macroMins:[120,240,480] };

function suite(tf, mpc, opts){
  let aggCash=0, aggBh=0, aggTr=0, worst=0, hurt=0; const rows=[];
  for (const s of SYMS){
    const r = runBacktest(load(`${s}_${tf}_2026ytd`), {minutesPerCandle:mpc, ...opts});
    aggCash+=r.vs_cash_usdt; aggBh+=r.vs_bh_usdt; aggTr+=r.trades;
    worst=Math.min(worst,r.vs_cash_usdt); if(r.vs_cash_usdt<-100) hurt++;
    rows.push(`  ${s.padEnd(9)} B&H ${r.buy_and_hold_return.padStart(8)}  strat ${r.strategy_return.padStart(7)}  vsCash $${String(r.vs_cash_usdt).padStart(7)}  vsBH $${String(r.vs_bh_usdt).padStart(7)}  tr ${String(r.trades).padStart(3)}  DD ${r.max_drawdown}`);
  }
  return {aggCash,aggBh,aggTr,worst,hurt,rows};
}

console.log('################  2026 YTD VALIDATION  ################');
for (const [tf,mpc] of [['1h',60],['15m',15]]){
  const r = suite(tf,mpc,base);
  console.log(`\n===== ${tf} (default tuned: lambda 0.0035) =====`);
  r.rows.forEach(x=>console.log(x));
  console.log(`  ---- AGG vsCash $${r.aggCash.toFixed(0)}  vsBH $${r.aggBh.toFixed(0)}  trades ${r.aggTr}  hurt(<-$100) ${r.hurt}/6  worst $${r.worst.toFixed(0)}`);
}

console.log('\n===== lambda robustness (1h, aggregate vsCash / vsBH / trades) =====');
for (const lam of [0.0008, 0.0015, 0.0035, 0.006, 0.01]){
  const r = suite('1h',60,{...base, lambda:lam});
  console.log(`  lambda ${String(lam).padEnd(7)}  vsCash $${r.aggCash.toFixed(0).padStart(6)}  vsBH $${r.aggBh.toFixed(0).padStart(6)}  trades ${String(r.aggTr).padStart(4)}  hurt ${r.hurt}/6  worst $${r.worst.toFixed(0)}`);
}

console.log('\n===== regime labels by month (BTC 1h) — must NOT call the Mar-Apr relief a "bull" =====');
const c = load('BTCUSDT_1h_2026ytd');
let cur='';
for (let i=0;i<c.length;i+=24){
  const m = new Date(c[i].t).toISOString().slice(0,7);
  if (m!==cur){ cur=m; const reg = classifyRegime(c, 60, i); console.log(`  ${m}  ->  ${reg}`); }
}
