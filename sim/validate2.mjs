// Parallel validation of engine2 across the dataset manifest, using worker child
// processes (one per dataset) so the whole sweep runs concurrently.
// Usage: node sim/validate2.mjs [optsJSON]
import { fork } from 'child_process';
import { DATASETS } from './datasets.mjs';

const opts = JSON.parse(process.argv[2] || '{}');

function runOne(name, mpc) {
  return new Promise((resolve) => {
    const child = fork(new URL('./worker2.mjs', import.meta.url), [], { stdio: ['ignore', 'pipe', 'inherit', 'ipc'] });
    child.send({ name, mpc, opts });
    child.on('message', (msg) => { resolve(msg); child.kill(); });
  });
}

const results = await Promise.all(DATASETS.map(([n, m]) => runOne(n, m).then(r => ({ name: n, regime: DATASETS.find(d => d[0] === n)[2], ...r }))));

let aggCash = 0, aggBh = 0, aggTrades = 0, hurt = 0, worst = 0;
const byRegime = {};
console.log('\n dataset                    regime  strat     B&H     vsCash   vsBH   trades  maxDD');
for (const r of results) {
  aggCash += r.vs_cash_usdt; aggBh += r.vs_bh_usdt; aggTrades += r.trades;
  if (r.vs_cash_usdt < -10) hurt++;
  worst = Math.min(worst, r.vs_cash_usdt);
  (byRegime[r.regime] ||= { cash: 0, bh: 0, n: 0 });
  byRegime[r.regime].cash += r.vs_cash_usdt; byRegime[r.regime].bh += r.vs_bh_usdt; byRegime[r.regime].n++;
  console.log(` ${r.name.padEnd(26)} ${r.regime.padEnd(5)} ${r.strategy_return.padStart(7)} ${r.buy_and_hold_return.padStart(8)}  $${String(r.vs_cash_usdt).padStart(7)} $${String(r.vs_bh_usdt).padStart(8)}  ${String(r.trades).padStart(5)}  ${r.max_drawdown}`);
}
console.log('\n by regime:');
for (const [k, v] of Object.entries(byRegime)) console.log(`   ${k.padEnd(6)} vsCash $${v.cash.toFixed(0)}   vsBH $${v.bh.toFixed(0)}   (${v.n} sets)`);
console.log(`\n AGG vsCash $${aggCash.toFixed(0)}   vsBH $${aggBh.toFixed(0)}   trades ${aggTrades}   hurt(<-$10) ${hurt}/${results.length}   worst $${worst.toFixed(0)}`);
