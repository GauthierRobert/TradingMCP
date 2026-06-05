// v2 — DUAL MOMENTUM portfolio: absolute trend filter (price>SMA100 & EMA rising) + relative
// cross-sectional momentum (hold only the top-K qualifying symbols by 60d return), equal weight,
// rest in cash. Goal: beat BOTH equal-weight Buy&Hold AND cash on 2025-2026. Causal, daily, fee on rebalances.
//   node bt2.mjs [START=2025-01-01] [K=2] [SYMS]
const DATA = 'https://api.binance.com/api/v3';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const FEE = 0.001;

async function fetchDaily(sym, startMs, endMs) {
  const all = []; let start = startMs;
  while (start < endMs) {
    const u = new URL(`${DATA}/klines`);
    u.searchParams.set('symbol', sym); u.searchParams.set('interval', '1d');
    u.searchParams.set('limit', '1000'); u.searchParams.set('startTime', String(start));
    let r, t = 0; do { r = await fetch(u); if (r.status === 429 || r.status === 418) { await sleep(1500 * ++t); continue; } break; } while (t < 5);
    if (!r.ok) throw new Error(`${sym} ${r.status}`);
    const rows = await r.json(); if (!rows.length) break;
    for (const k of rows) all.push({ t: k[0], c: +k[4], h: +k[2], l: +k[3] });
    if (rows.length < 1000) break; start = rows[rows.length - 1][0] + 1;
  }
  return all;
}
function ema(c, n) { const k = 2 / (n + 1); const out = Array(c.length).fill(null); let e = c[0]; for (let i = 0; i < c.length; i++) { e = i ? c[i] * k + e * (1 - k) : c[i]; out[i] = i + 1 >= n ? e : null; } return out; }
function sma(c, n) { const out = Array(c.length).fill(null); let s = 0; for (let i = 0; i < c.length; i++) { s += c[i]; if (i >= n) s -= c[i - n]; if (i + 1 >= n) out[i] = s / n; } return out; }
const fmt = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + '%';

const START = process.argv[2] || '2025-01-01';
const K = +(process.argv[3] || 2);
const SYMS = (process.argv[4] || 'BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT,DOGEUSDT,AVAXUSDT,LINKUSDT').split(',');
const startMs = Date.parse(START + 'T00:00:00Z'), endMs = Date.now();

// fetch + align on common timestamps
const raw = {};
for (const s of SYMS) raw[s] = await fetchDaily(s, startMs, endMs);
const counts = SYMS.map(s => new Map(raw[s].map((b, i) => [b.t, i])));
const common = raw[SYMS[0]].map(b => b.t).filter(t => counts.every(m => m.has(t)));
const N = common.length;
const C = {}, SMA100 = {}, EMA10 = {}, MOM = {};
for (let si = 0; si < SYMS.length; si++) {
  const s = SYMS[si], idx = counts[si], closes = common.map(t => raw[s][idx.get(t)].c);
  C[s] = closes; SMA100[s] = sma(closes, 100); EMA10[s] = ema(closes, 10);
  MOM[s] = closes.map((c, i) => i >= 60 ? c / closes[i - 60] - 1 : null);
}
const WU = 100;

// --- equal-weight Buy&Hold benchmark (hold all SYMS from day WU) ---
let bhEq = 0; for (const s of SYMS) bhEq += (C[s][N - 1] / C[s][WU] - 1); bhEq /= SYMS.length;

// --- dual-momentum portfolio ---
function runPortfolio(k) {
  let eq = 1, peak = 1, maxDD = 0, rebals = 0; let prev = new Set(); let inMktDays = 0;
  for (let i = WU; i < N - 1; i++) {
    const qualified = SYMS.filter(s => SMA100[s][i] != null && C[s][i] > SMA100[s][i] && EMA10[s][i] != null && EMA10[s][i] > EMA10[s][i - 1] && MOM[s][i] != null && MOM[s][i] > 0);
    qualified.sort((a, b) => MOM[b][i] - MOM[a][i]);
    const hold = qualified.slice(0, k);
    const cur = new Set(hold);
    // turnover fee: count symbols added or dropped vs prev, each leg ~ weight*FEE; approximate per-name
    let changed = 0; for (const s of cur) if (!prev.has(s)) changed++; for (const s of prev) if (!cur.has(s)) changed++;
    if (changed) { eq *= (1 - FEE * changed / Math.max(1, k)); rebals++; }
    // next-day portfolio return = equal weight of held names (cash=0 for empty slots)
    let r = 0; for (const s of hold) r += (C[s][i + 1] / C[s][i] - 1); r /= k;   // empty slots earn 0 (cash)
    eq *= (1 + r);
    if (hold.length) inMktDays++;
    peak = Math.max(peak, eq); maxDD = Math.max(maxDD, (peak - eq) / peak);
    prev = cur;
  }
  return { ret: eq - 1, maxDD, rebals, inMkt: inMktDays / (N - 1 - WU) };
}

console.log(`\n=== DUAL-MOMENTUM PORTFOLIO — DAILY ${START}->now, ${SYMS.length} majors, fee ${(FEE*100).toFixed(2)}% ===`);
console.log(`Benchmarks:  equal-weight BUY&HOLD ${fmt(bhEq)}   |   CASH +0.0%`);
for (const k of [1, 2, 3, 4]) {
  const r = runPortfolio(k);
  const vsBH = r.ret - bhEq;
  console.log(`  top-K=${k}  ret ${fmt(r.ret).padStart(7)}  vsBH ${fmt(vsBH).padStart(7)}  vsCash ${fmt(r.ret).padStart(7)}  DD ${(r.maxDD*100).toFixed(0)}%  inMkt ${Math.round(r.inMkt*100)}%  rebals ${r.rebals}  ${r.ret>bhEq?'BEAT-BH':''} ${r.ret>0?'BEAT-CASH':''}`);
}
