// v3 — EQUAL-WEIGHT TREND PORTFOLIO (the robust winner). Each symbol holds a fixed 1/N sleeve that
// is INVESTED when the asset trends up, else CASH. No cross-sectional chasing. Tests two gates and
// reports on BOTH the full 2025-26 span and 2026-only. vs equal-weight Buy&Hold and vs Cash.
//   node bt3.mjs [START]
const DATA = 'https://api.binance.com/api/v3';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const FEE = 0.001;
const SYMS = 'BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT,DOGEUSDT,AVAXUSDT,LINKUSDT'.split(',');

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
const sma = (c, n) => { const o = Array(c.length).fill(null); let s = 0; for (let i = 0; i < c.length; i++) { s += c[i]; if (i >= n) s -= c[i - n]; if (i + 1 >= n) o[i] = s / n; } return o; };
const ema = (c, n) => { const k = 2 / (n + 1); const o = Array(c.length).fill(null); let e = c[0]; for (let i = 0; i < c.length; i++) { e = i ? c[i] * k + e * (1 - k) : c[i]; o[i] = i + 1 >= n ? e : null; } return o; };
const fmt = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + '%';

const endMs = Date.now();
const raw = {}; for (const s of SYMS) raw[s] = await fetchDaily(s, Date.parse('2024-06-01T00:00:00Z'), endMs); // fetch extra history for warmup
const counts = SYMS.map(s => new Map(raw[s].map((b, i) => [b.t, i])));
const allT = raw[SYMS[0]].map(b => b.t).filter(t => counts.every(m => m.has(t)));
const C = {}, S100 = {}, S200 = {}, E10 = {};
for (let si = 0; si < SYMS.length; si++) { const s = SYMS[si], idx = counts[si]; C[s] = allT.map(t => raw[s][idx.get(t)].c); S100[s] = sma(C[s], 100); S200[s] = sma(C[s], 200); E10[s] = ema(C[s], 10); }

// sleeve invested[i] booleans per gate
function invested(gate, s, i) {
  if (S100[s][i] == null || E10[s][i] == null) return false;
  const base = C[s][i] > S100[s][i] && E10[s][i] > E10[s][i - 1];
  if (gate === 'trend') return base;
  if (gate === 'trend+200') return base && S200[s][i] != null && C[s][i] > S200[s][i]; // drop perma-downtrenders
  return base;
}
// equal-weight portfolio over [from,to): each sleeve 1/N, invested or cash
function port(gate, from, to) {
  let eq = 1, peak = 1, dd = 0, sw = 0; const prev = {}; let inMkt = 0, tot = 0;
  for (let i = from; i < to - 1; i++) {
    let r = 0, held = 0;
    for (const s of SYMS) {
      const inv = invested(gate, s, i);
      if (inv !== !!prev[s]) { eq *= (1 - FEE / SYMS.length); sw++; }   // per-sleeve switch cost
      prev[s] = inv;
      r += (inv ? (C[s][i + 1] / C[s][i] - 1) : 0) / SYMS.length;
      if (inv) held++;
    }
    eq *= (1 + r); if (held) inMkt++; tot++;
    peak = Math.max(peak, eq); dd = Math.max(dd, (peak - eq) / peak);
  }
  return { ret: eq - 1, dd, sw, inMkt: inMkt / tot };
}
const bhEq = (from, to) => { let b = 0; for (const s of SYMS) b += (C[s][to - 1] / C[s][from] - 1); return b / SYMS.length; };

function report(label, startISO) {
  const startMs = Date.parse(startISO + 'T00:00:00Z');
  let from = allT.findIndex(t => t >= startMs); if (from < 200) from = 200;   // ensure 200d warmup available
  const to = allT.length;
  const bh = bhEq(from, to);
  console.log(`\n=== ${label}  (${to - from}d, from ${new Date(allT[from]).toISOString().slice(0,10)}) ===`);
  console.log(`  equal-weight BUY&HOLD ${fmt(bh)}   |   CASH +0.0%`);
  for (const gate of ['trend', 'trend+200']) {
    const r = port(gate, from, to);
    console.log(`  ${gate.padEnd(10)} ret ${fmt(r.ret).padStart(7)}  vsBH ${fmt(r.ret - bh).padStart(7)}  vsCash ${fmt(r.ret).padStart(7)}  DD ${(r.dd*100).toFixed(0)}%  inMkt ${Math.round(r.inMkt*100)}%  switches ${r.sw}  ${r.ret>bh?'BEAT-BH':''} ${r.ret>0?'BEAT-CASH':''}`);
  }
}
report('FULL 2025-2026', '2025-01-01');
report('2026-ONLY', '2026-01-01');
