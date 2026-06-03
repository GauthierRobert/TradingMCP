// Out-of-sample test: run candidate configs on windows NOT used during tuning.
// Honest test of whether the bear edge generalizes. Parallel via child processes.
import { fork } from 'child_process';
import os from 'os';

const OOS = [
  ['BTCUSDT_15m_oosCrash21', 15], ['ETHUSDT_15m_oosCrash21', 15],
  ['BTCUSDT_15m_oosFTX', 15], ['ETHUSDT_15m_oosFTX', 15],
  ['SOLUSDT_15m_oosSolTop', 15], ['DOGEUSDT_15m_oosDoge21', 15],
  ['BTCUSDT_15m_oos2024', 15], ['BNBUSDT_1h_oosBnb22', 60],
];
const CONFIGS = {
  'rsi':             { entryConfirm: 'emaReclaim', families: ['rsi'] },
  'rsi+gate08w360':  { entryConfirm: 'emaReclaim', families: ['rsi'], declMax: 0.08, declWinMins: 360 },
  'rsi+gate12w360':  { entryConfirm: 'emaReclaim', families: ['rsi'], declMax: 0.12, declWinMins: 360 },
  'rsi+gate08w720':  { entryConfirm: 'emaReclaim', families: ['rsi'], declMax: 0.08, declWinMins: 720 },
  'rsi+gate06w240':  { entryConfirm: 'emaReclaim', families: ['rsi'], declMax: 0.06, declWinMins: 240 },
};

const LIMIT = Math.max(2, os.cpus().length - 2);
const jobs = [];
for (const [cfgName, opts] of Object.entries(CONFIGS)) for (const [name, mpc] of OOS) jobs.push({ cfgName, opts, name, mpc });
function runJob(job) {
  return new Promise((resolve) => {
    const c = fork(new URL('./worker2.mjs', import.meta.url), [], { stdio: ['ignore', 'pipe', 'inherit', 'ipc'] });
    c.send({ name: job.name, mpc: job.mpc, opts: job.opts });
    c.on('message', (m) => { resolve({ ...job, ...m }); c.kill(); });
  });
}
async function pool(jobs, limit) { const out = []; let i = 0; const w = async () => { while (i < jobs.length) { const j = jobs[i++]; out.push(await runJob(j)); } }; await Promise.all(Array.from({ length: limit }, w)); return out; }

const res = await pool(jobs, LIMIT);
const byCfg = {};
for (const r of res) {
  (byCfg[r.cfgName] ||= { rows: [], cash: 0, bh: 0, tr: 0, worst: 0, neg: 0 });
  const b = byCfg[r.cfgName]; b.rows.push(r); b.cash += r.vs_cash_usdt; b.bh += r.vs_bh_usdt; b.tr += r.trades;
  b.worst = Math.min(b.worst, r.vs_cash_usdt); if (r.vs_cash_usdt < -10) b.neg++;
}
for (const [name, b] of Object.entries(byCfg)) {
  console.log(`\n===== ${name} =====`);
  for (const r of b.rows.sort((a, z) => a.name.localeCompare(z.name)))
    console.log(`  ${r.name.padEnd(26)} strat ${r.strategy_return.padStart(8)}  B&H ${r.buy_and_hold_return.padStart(8)}  vsCash $${String(r.vs_cash_usdt).padStart(7)}  tr ${String(r.trades).padStart(3)}`);
  console.log(`  ---- OOS AGG vsCash $${b.cash.toFixed(0)}   vsBH $${b.bh.toFixed(0)}   trades ${b.tr}   worst $${b.worst.toFixed(0)}   lose-to-cash ${b.neg}/${b.rows.length}`);
}
