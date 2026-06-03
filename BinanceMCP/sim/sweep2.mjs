// Parallel sweep over global hypothesis configs × datasets.
// Forks one worker per (config,dataset) pair, capped at a concurrency limit.
// Reports per-config aggregates split by regime (bear/chop/bull) — the bar to clear
// is BEAT CASH (vsCash > 0) in bear, while not wrecking bull/chop.
import { fork } from 'child_process';
import os from 'os';
import { DATASETS } from './datasets.mjs';

const CONFIGS = {
  'baseline':                 {},
  'turnup':                   { entryConfirm: 'turnup' },
  'emaReclaim':               { entryConfirm: 'emaReclaim' },
  'turnup+decl15':            { entryConfirm: 'turnup', declMax: 0.15 },
  'emaRec+decl15':            { entryConfirm: 'emaReclaim', declMax: 0.15 },
  'emaRec+decl10+edge1':      { entryConfirm: 'emaReclaim', declMax: 0.10, edgeMargin: 0.01 },
  'turnup+edge2':             { entryConfirm: 'turnup', edgeMargin: 0.02 },
  'emaRec+decl20+edge15':     { entryConfirm: 'emaReclaim', declMax: 0.20, edgeMargin: 0.015 },
};

const LIMIT = Math.max(2, os.cpus().length - 2);
const jobs = [];
for (const [cfgName, opts] of Object.entries(CONFIGS))
  for (const [name, mpc, regime] of DATASETS) jobs.push({ cfgName, opts, name, mpc, regime });

function runJob(job) {
  return new Promise((resolve) => {
    const child = fork(new URL('./worker2.mjs', import.meta.url), [], { stdio: ['ignore', 'pipe', 'inherit', 'ipc'] });
    child.send({ name: job.name, mpc: job.mpc, opts: job.opts });
    child.on('message', (msg) => { resolve({ ...job, ...msg }); child.kill(); });
  });
}

async function runPool(jobs, limit) {
  const results = []; let i = 0;
  async function worker() { while (i < jobs.length) { const job = jobs[i++]; results.push(await runJob(job)); } }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

const t0 = Date.now();
const results = await runPool(jobs, LIMIT);
const agg = {};
for (const r of results) {
  const a = (agg[r.cfgName] ||= { bear: { c: 0, b: 0, n: 0, worst: 0 }, chop: { c: 0, b: 0, n: 0, worst: 0 }, bull: { c: 0, b: 0, n: 0, worst: 0 }, trades: 0 });
  a[r.regime].c += r.vs_cash_usdt; a[r.regime].b += r.vs_bh_usdt; a[r.regime].n++;
  a[r.regime].worst = Math.min(a[r.regime].worst, r.vs_cash_usdt); a.trades += r.trades;
}
console.log(`\n config (${(Date.now() - t0) / 1000}s)            | BEAR vsCash  vsBH  worst | CHOP vsCash | BULL vsCash | trades`);
for (const [name, a] of Object.entries(agg)) {
  console.log(` ${name.padEnd(24)} | $${String(a.bear.c.toFixed(0)).padStart(6)} $${String(a.bear.b.toFixed(0)).padStart(6)} $${String(a.bear.worst.toFixed(0)).padStart(6)} | $${String(a.chop.c.toFixed(0)).padStart(6)} | $${String(a.bull.c.toFixed(0)).padStart(6)} | ${a.trades}`);
}
