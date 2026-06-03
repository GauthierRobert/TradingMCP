// Train-vs-OOS comparison: for each candidate config, aggregate bear vsCash on the
// TRAINING bears (used during tuning) and on the OOS crash windows (never tuned on).
// A config whose edge is REAL improves both; an overfit one improves only training.
import { fork } from 'child_process';
import os from 'os';
import { DATASETS } from './datasets.mjs';

const TRAIN = DATASETS.filter(d => d[2] === 'bear').map(d => [d[0], d[1]]);
const OOS = [
  ['BTCUSDT_15m_oosCrash21', 15], ['ETHUSDT_15m_oosCrash21', 15],
  ['BTCUSDT_15m_oosFTX', 15], ['ETHUSDT_15m_oosFTX', 15],
  ['SOLUSDT_15m_oosSolTop', 15], ['DOGEUSDT_15m_oosDoge21', 15],
  ['BTCUSDT_15m_oos2024', 15], ['BNBUSDT_1h_oosBnb22', 60],
];
const CONFIGS = {
  'rsi':            { entryConfirm: 'emaReclaim', families: ['rsi'] },
  'rsi+gate08w360': { entryConfirm: 'emaReclaim', families: ['rsi'], declMax: 0.08, declWinMins: 360 },
  'rsi+gate12w360': { entryConfirm: 'emaReclaim', families: ['rsi'], declMax: 0.12, declWinMins: 360 },
  'rsi+gate08w720': { entryConfirm: 'emaReclaim', families: ['rsi'], declMax: 0.08, declWinMins: 720 },
  'rsi+gate06w240': { entryConfirm: 'emaReclaim', families: ['rsi'], declMax: 0.06, declWinMins: 240 },
  'rsi+gate10w480': { entryConfirm: 'emaReclaim', families: ['rsi'], declMax: 0.10, declWinMins: 480 },
};
const LIMIT = Math.max(2, os.cpus().length - 2);
function runJob(name, mpc, opts) {
  return new Promise((resolve) => {
    const c = fork(new URL('./worker2.mjs', import.meta.url), [], { stdio: ['ignore', 'pipe', 'inherit', 'ipc'] });
    c.send({ name, mpc, opts });
    c.on('message', (m) => { resolve(m); c.kill(); });
  });
}
const jobs = [];
for (const [cfg, opts] of Object.entries(CONFIGS)) {
  for (const [n, m] of TRAIN) jobs.push({ cfg, set: 'train', n, m, opts });
  for (const [n, m] of OOS) jobs.push({ cfg, set: 'oos', n, m, opts });
}
let i = 0; const results = [];
async function w() { while (i < jobs.length) { const j = jobs[i++]; const r = await runJob(j.n, j.m, j.opts); results.push({ ...j, ...r }); } }
await Promise.all(Array.from({ length: LIMIT }, w));
const agg = {};
for (const r of results) {
  const a = (agg[r.cfg] ||= { train: { c: 0, n: 0, neg: 0, worst: 0 }, oos: { c: 0, n: 0, neg: 0, worst: 0 } });
  a[r.set].c += r.vs_cash_usdt; a[r.set].n++; if (r.vs_cash_usdt < -10) a[r.set].neg++; a[r.set].worst = Math.min(a[r.set].worst, r.vs_cash_usdt);
}
console.log('\n config            | TRAIN bear vsCash  neg  worst | OOS vsCash  neg  worst');
for (const [cfg, a] of Object.entries(agg))
  console.log(` ${cfg.padEnd(16)} | $${String(a.train.c.toFixed(0)).padStart(7)}  ${a.train.neg}/${a.train.n}  $${String(a.train.worst.toFixed(0)).padStart(6)} | $${String(a.oos.c.toFixed(0)).padStart(7)}  ${a.oos.neg}/${a.oos.n}  $${String(a.oos.worst.toFixed(0)).padStart(6)}`);
