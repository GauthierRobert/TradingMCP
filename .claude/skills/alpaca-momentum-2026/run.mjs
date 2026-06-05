// CLI for alpaca-momentum-2026 — dual-gate trend-regime equal-weight portfolio.
// Fetches public DAILY closes (Binance, no auth) and drives the pure engine. Long/flat spot.
//   node run.mjs backtest [START=2025-01-01] [SYMS]      # vs equal-weight Buy&Hold + Cash, both windows
//   node run.mjs decide   [SYMS]                          # current posture per asset + target weights
//   node run.mjs validate [START]                         # alias of backtest
import { assetSignal, backtestPortfolio, buyHoldEqual, DEFAULT_CFG } from './engine.mjs';

const DATA = 'https://api.binance.com/api/v3';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const DEFAULT_SYMS = 'BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT,DOGEUSDT,AVAXUSDT,LINKUSDT';
const fmt = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + '%';

async function fetchDaily(sym, startMs, endMs) {
  const all = []; let start = startMs;
  while (start < endMs) {
    const u = new URL(`${DATA}/klines`); u.searchParams.set('symbol', sym); u.searchParams.set('interval', '1d');
    u.searchParams.set('limit', '1000'); u.searchParams.set('startTime', String(start));
    let r, t = 0; do { r = await fetch(u); if (r.status === 429 || r.status === 418) { await sleep(1500 * ++t); continue; } break; } while (t < 5);
    if (!r.ok) throw new Error(`${sym} ${r.status}`); const rows = await r.json(); if (!rows.length) break;
    for (const k of rows) all.push({ t: k[0], c: +k[4] }); if (rows.length < 1000) break; start = rows[rows.length - 1][0] + 1;
  }
  return all;
}
// Fetch + align all symbols on common daily timestamps. Returns {closesBySym, ts}.
async function loadAligned(syms, fetchFromISO) {
  const raw = {}; for (const s of syms) raw[s] = await fetchDaily(s, Date.parse(fetchFromISO + 'T00:00:00Z'), Date.now());
  const maps = syms.map(s => new Map(raw[s].map((b, i) => [b.t, i])));
  const ts = raw[syms[0]].map(b => b.t).filter(t => maps.every(m => m.has(t)));
  const closesBySym = {}; for (let si = 0; si < syms.length; si++) closesBySym[syms[si]] = ts.map(t => raw[syms[si]][maps[si].get(t)].c);
  return { closesBySym, ts };
}

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'backtest' || cmd === 'validate' || !cmd) {
  const start = args[0] || '2025-01-01';
  const syms = (args[1] || DEFAULT_SYMS).split(',');
  const { closesBySym, ts } = await loadAligned(syms, '2024-06-01');   // extra history for 200d warmup
  const idxFrom = (iso) => { const ms = Date.parse(iso + 'T00:00:00Z'); let i = ts.findIndex(t => t >= ms); return Math.max(i, 200); };
  console.log(`\n=== alpaca-momentum-2026 — dual-gate trend portfolio, ${syms.length} majors, fee ${(DEFAULT_CFG.feePerSwitch*100).toFixed(2)}%/switch ===`);
  for (const [label, from] of [['FULL ' + start, idxFrom(start)], ['2026-ONLY', idxFrom('2026-01-01')]]) {
    const bh = buyHoldEqual(closesBySym, syms, from);
    const r = backtestPortfolio(closesBySym, syms, DEFAULT_CFG, from);
    console.log(`\n${label}  (${ts.length - from}d, from ${new Date(ts[from]).toISOString().slice(0,10)})`);
    console.log(`  equal-weight BUY&HOLD ${fmt(bh)}   |   CASH +0.0%`);
    console.log(`  STRATEGY              ret ${fmt(r.ret)}  vsBH ${fmt(r.ret - bh)}  vsCash ${fmt(r.ret)}  maxDD ${(r.maxDD*100).toFixed(0)}%  inMkt ${Math.round(r.inMktFrac*100)}%  switches ${r.switches}  ${r.ret>bh?'BEAT-BH ✓':''} ${r.ret>0?'BEAT-CASH ✓':''}`);
  }
}

if (cmd === 'decide') {
  const syms = (args[0] || DEFAULT_SYMS).split(',');
  const { closesBySym, ts } = await loadAligned(syms, '2024-06-01');
  const held = [];
  console.log(`\n=== alpaca-momentum-2026 — current posture (daily, ${new Date(ts[ts.length-1]).toISOString().slice(0,10)}) ===`);
  for (const s of syms) {
    const sig = assetSignal(closesBySym[s], DEFAULT_CFG);
    if (sig.invested) held.push(s);
    console.log(`  ${s.padEnd(9)} ${sig.posture.padEnd(4)}  px ${sig.price.toFixed(4).padStart(11)}  [${sig.reason}]`);
  }
  const w = held.length ? (1 / syms.length) : 0;
  console.log(`\n  TARGET PORTFOLIO: ${held.length ? held.map(s => `${s} ${(w*100).toFixed(1)}%`).join('  ') : '— none —'}  | CASH ${(100*(1 - held.length/syms.length)).toFixed(1)}%`);
  console.log(`  (each invested sleeve = ${(100/syms.length).toFixed(1)}% of equity; rest stays in USD/USDT.)`);
}
