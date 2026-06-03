// End-to-end router test: classify regime -> pick mode -> run engine in that mode.
// bull -> rideTrend (ride the trend); bear-capit -> flat (cash); else -> engine default.
import fs from 'fs';
import { runBacktest, classifyRegime } from './engine.mjs';

const DS = [
  // bull controls
  ['BTCUSDT_5m_bull',5],['ETHUSDT_5m_bull',5],['BTCUSDT_1h_bull',60],['BTCUSDT_1h_bull2024',60],
  // bear/chop core suite
  ['BTCUSDT_5m',5],['ETHUSDT_5m',5],['DOGEUSDT_5m',5],['SOLUSDT_5m',5],['XRPUSDT_5m',5],['BNBUSDT_5m',5],
  ['BTCUSDT_1h_bear2022',60],['ETHUSDT_1h_bear2022',60],['BTCUSDT_1h_chop2023',60],
];
const load = n => JSON.parse(fs.readFileSync(`sim/data/${n}.json`,'utf8'));
const base = { lambda:0.0035, macroMins:[120,240,480] };

// classify on the FIRST 40% (causal: regime known before the window we trade)
const modeFor = (c, mpc) => {
  const cut = Math.floor(c.length*0.4);
  const reg = classifyRegime(c.slice(0,cut), mpc);
  if (reg==='bull') return {reg, opts:{...base, rideTrend:true}};
  if (reg==='bear-capit') return {reg, opts:{...base, flat:true}}; // flat handled below
  return {reg, opts:base};
};

let rOld=0,rNew=0,bhSum=0;
console.log('dataset             regime       baseline   routed     B&H        delta');
for (const [n,mpc] of DS){
  const c = load(n);
  const {reg,opts} = modeFor(c,mpc);
  const bl = runBacktest(c,{minutesPerCandle:mpc,...base});
  const routed = opts.flat ? {strategy_return:'0.00%',vs_cash_usdt:0,finalEq:10000} : runBacktest(c,{minutesPerCandle:mpc,...opts});
  const bh = bl.buy_and_hold_return;
  rOld += bl.finalEq-10000; rNew += routed.finalEq-10000; bhSum += (parseFloat(bh)/100)*10000;
  const d = (routed.finalEq-bl.finalEq);
  console.log(`${n.padEnd(20)}${reg.padEnd(12)} ${bl.strategy_return.padStart(8)}  ${routed.strategy_return.padStart(8)}  ${bh.padStart(8)}  ${(d>=0?'+':'')+d.toFixed(0)}`);
}
console.log(`\nTOTAL $ vs cash    baseline $${rOld.toFixed(0)}   routed $${rNew.toFixed(0)}   (B&H sum $${bhSum.toFixed(0)})`);
