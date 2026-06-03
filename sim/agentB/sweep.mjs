// Aggregating sweep driver. Uses a chosen engine (shared or agentB copy).
// node sim/agentB/sweep.mjs <enginePath> <optsJSON> [label]
import fs from 'fs';
const [enginePath, optsJson = '{}', label = ''] = process.argv.slice(2);
const { runBacktest } = await import('file://' + fs.realpathSync(enginePath));

const DS = [['SOLUSDT_5m',5],['XRPUSDT_5m',5],['BNBUSDT_5m',5]];
// full + thirds + quarters
const SLICES = [[0,1],[0,0.33],[0.33,0.66],[0.66,1],[0,0.25],[0.25,0.5],[0.5,0.75],[0.75,1]];
const extra = JSON.parse(optsJson);

let sumCash=0, sumBh=0, n=0, totTr=0;
const rows=[];
for (const [name,mpc] of DS){
  const all = JSON.parse(fs.readFileSync(`sim/data/${name}.json`,'utf8'));
  for (const [sf,ef] of SLICES){
    const a=Math.floor(sf*all.length), b=Math.ceil(ef*all.length);
    const candles=all.slice(a,b);
    const r=runBacktest(candles,{minutesPerCandle:mpc,...extra});
    sumCash+=r.vs_cash_usdt; sumBh+=r.vs_bh_usdt; n++; totTr+=r.trades;
    rows.push({name,slice:`${sf}..${ef}`,vc:r.vs_cash_usdt,vb:r.vs_bh_usdt,tr:r.trades});
  }
}
console.log(JSON.stringify({label,avg_vs_cash:+(sumCash/n).toFixed(1),avg_vs_bh:+(sumBh/n).toFixed(1),sum_vs_cash:+sumCash.toFixed(0),sum_vs_bh:+sumBh.toFixed(0),avg_trades:+(totTr/n).toFixed(1),n}));
if (process.env.DETAIL) console.log(JSON.stringify(rows));
