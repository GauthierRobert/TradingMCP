// Same sweep harness but over BTC/ETH/DOGE majors-ish, to compare param needs.
import fs from 'fs';
const [enginePath, optsJson = '{}', label = ''] = process.argv.slice(2);
const { runBacktest } = await import('file://' + fs.realpathSync(enginePath));
const DS = [['BTCUSDT_5m',5],['ETHUSDT_5m',5],['DOGEUSDT_5m',5]];
const SLICES = [[0,1],[0,0.33],[0.33,0.66],[0.66,1],[0,0.25],[0.25,0.5],[0.5,0.75],[0.75,1]];
const extra = JSON.parse(optsJson);
let sumCash=0,sumBh=0,n=0,totTr=0;
for (const [name,mpc] of DS){
  const all=JSON.parse(fs.readFileSync(`sim/data/${name}.json`,'utf8'));
  for (const [sf,ef] of SLICES){
    const a=Math.floor(sf*all.length),b=Math.ceil(ef*all.length);
    const r=runBacktest(all.slice(a,b),{minutesPerCandle:mpc,...extra});
    sumCash+=r.vs_cash_usdt;sumBh+=r.vs_bh_usdt;n++;totTr+=r.trades;
  }
}
console.log(JSON.stringify({label,avg_vs_cash:+(sumCash/n).toFixed(1),avg_vs_bh:+(sumBh/n).toFixed(1),avg_trades:+(totTr/n).toFixed(1),n}));
