// Research harness: can a simple, robust long/flat strategy BEAT BUY-AND-HOLD on 2025-2026 crypto?
// Pulls real DAILY klines (Binance public, no auth), runs several well-known low-parameter
// strategies, reports vs Buy&Hold AND vs Cash (0%). Causal: decision for day i+1 uses data <= day i.
//   node bt.mjs [START=2025-01-01] [SYMS=BTCUSDT,ETHUSDT,...]
const DATA = 'https://api.binance.com/api/v3';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const FEE = 0.001;                 // 0.10% per switch (Binance taker). Trend strats switch rarely.

async function fetchDaily(sym, startMs, endMs) {
  const all = [];
  let start = startMs;
  while (start < endMs) {
    const u = new URL(`${DATA}/klines`);
    u.searchParams.set('symbol', sym); u.searchParams.set('interval', '1d');
    u.searchParams.set('limit', '1000'); u.searchParams.set('startTime', String(start));
    let r, t = 0;
    do { r = await fetch(u); if (r.status === 429 || r.status === 418) { await sleep(1500 * ++t); continue; } break; } while (t < 5);
    if (!r.ok) throw new Error(`${sym} ${r.status}`);
    const rows = await r.json();
    if (!rows.length) break;
    for (const k of rows) all.push({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] });
    if (rows.length < 1000) break;
    start = rows[rows.length - 1][0] + 1;
  }
  return all;
}

const sma = (a, i, n) => { if (i + 1 < n) return null; let s = 0; for (let k = i - n + 1; k <= i; k++) s += a[k].c; return s / n; };
function ema(arr, n) { const k = 2 / (n + 1); const out = Array(arr.length).fill(null); let e = arr[0].c; for (let i = 0; i < arr.length; i++) { e = i ? arr[i].c * k + e * (1 - k) : arr[i].c; out[i] = i + 1 >= n ? e : null; } return out; }
const hiN = (a, i, n) => { if (i < n) return null; let m = -Infinity; for (let k = i - n; k < i; k++) m = Math.max(m, a[k].h); return m; };
const loN = (a, i, n) => { if (i < n) return null; let m = Infinity; for (let k = i - n; k < i; k++) m = Math.min(m, a[k].l); return m; };

// Generic long/flat backtest. wantLong(i, ctx) -> boolean desired position entering day i+1 (decided on close i).
// Returns {ret, maxDD, days, switches, inMkt}.
function runLongFlat(bars, wantLong, warmup) {
  let eq = 1, pos = 0, peak = 1, maxDD = 0, switches = 0, inMkt = 0;
  for (let i = warmup; i < bars.length - 1; i++) {
    const desired = wantLong(i) ? 1 : 0;
    if (desired !== pos) { eq *= (1 - FEE); switches++; pos = desired; }   // switch cost
    const r = bars[i + 1].c / bars[i].c - 1;                               // next-day return
    eq *= (1 + pos * r);
    if (pos) inMkt++;
    peak = Math.max(peak, eq); maxDD = Math.max(maxDD, (peak - eq) / peak);
  }
  return { ret: eq - 1, maxDD, days: bars.length - 1 - warmup, switches, inMkt };
}
const buyHold = (bars, warmup) => bars[bars.length - 1].c / bars[warmup].c - 1;

// ---- strategies (causal: only data up to & including day i) ----
const strategies = {
  'SMA100':      (bars) => { const f = i => { const m = sma(bars, i, 100); return m != null && bars[i].c > m; }; return { f, warmup: 100 }; },
  'SMA50':       (bars) => { const f = i => { const m = sma(bars, i, 50);  return m != null && bars[i].c > m; }; return { f, warmup: 50 }; },
  'EMA20/50':    (bars) => { const ef = ema(bars, 20), es = ema(bars, 50); const f = i => ef[i] != null && es[i] != null && ef[i] > es[i]; return { f, warmup: 50 }; },
  'EMA10/30':    (bars) => { const ef = ema(bars, 10), es = ema(bars, 30); const f = i => ef[i] != null && es[i] != null && ef[i] > es[i]; return { f, warmup: 30 }; },
  'Donch20/10':  (bars) => { let on = false; const f = i => { const hi = hiN(bars, i, 20), lo = loN(bars, i, 10); if (hi != null && bars[i].c > hi) on = true; else if (lo != null && bars[i].c < lo) on = false; return on; }; return { f, warmup: 20 }; },
  'TSMom90':     (bars) => { const f = i => i >= 90 && bars[i].c > bars[i - 90].c; return { f, warmup: 90 }; },
  // Trend filter + dip re-entry confirmation: hold only above SMA100 AND fast EMA rising (avoid catching knives)
  'SMA100+EMA':  (bars) => { const e = ema(bars, 10); const f = i => { const m = sma(bars, i, 100); return m != null && bars[i].c > m && e[i] != null && i > 0 && e[i] > e[i - 1]; }; return { f, warmup: 100 }; },
};

const fmtPct = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + '%';

const START = process.argv[2] || '2025-01-01';
const SYMS = (process.argv[3] || 'BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT,DOGEUSDT,AVAXUSDT,LINKUSDT').split(',');
const startMs = Date.parse(START + 'T00:00:00Z');
const endMs = Date.now();

const agg = {};                      // strat -> {sumRet, beatBH, beatCash, n}
for (const s of Object.keys(strategies)) agg[s] = { sumRet: 0, sumVsBH: 0, beatBH: 0, beatCash: 0, n: 0, dd: 0, sw: 0 };
let bhAgg = 0;

console.log(`\n=== BEAT-BUY&HOLD research — DAILY, ${START} -> now, fee ${(FEE*100).toFixed(2)}%/switch ===`);
for (const sym of SYMS) {
  const bars = await fetchDaily(sym, startMs, endMs);
  if (bars.length < 120) { console.log(`${sym}: too few bars (${bars.length})`); continue; }
  const warmupMax = 100;
  const bh = buyHold(bars, warmupMax);
  bhAgg += bh;
  console.log(`\n${sym}  (${bars.length}d)   BUY&HOLD ${fmtPct(bh)}   CASH +0.0%`);
  for (const [name, build] of Object.entries(strategies)) {
    const { f, warmup } = build(bars);
    const w = Math.max(warmup, warmupMax);            // align warmup so all compare on same span
    const res = runLongFlat(bars, f, w);
    const vsBH = res.ret - bh;
    const a = agg[name];
    a.sumRet += res.ret; a.sumVsBH += vsBH; a.beatBH += res.ret > bh ? 1 : 0; a.beatCash += res.ret > 0 ? 1 : 0; a.n++; a.dd += res.maxDD; a.sw += res.switches;
    const flagBH = res.ret > bh ? 'BEAT-BH' : '       ';
    const flagC = res.ret > 0 ? 'BEAT-CASH' : '         ';
    console.log(`  ${name.padEnd(12)} ret ${fmtPct(res.ret).padStart(7)}  vsBH ${fmtPct(vsBH).padStart(7)}  DD ${(res.maxDD*100).toFixed(0).padStart(2)}%  inMkt ${Math.round(100*res.inMkt/res.days)}%  sw ${res.switches}  ${flagBH} ${flagC}`);
  }
}

console.log(`\n=== AGGREGATE across ${SYMS.length} symbols (avg) ===`);
console.log(`Buy&Hold avg: ${fmtPct(bhAgg / SYMS.length)}   |   Cash: +0.0%`);
const ranked = Object.entries(agg).filter(([,a]) => a.n).sort((x, y) => y[1].sumVsBH - x[1].sumVsBH);
for (const [name, a] of ranked) {
  console.log(`  ${name.padEnd(12)} avgRet ${fmtPct(a.sumRet/a.n).padStart(7)}  avgVsBH ${fmtPct(a.sumVsBH/a.n).padStart(7)}  beatBH ${a.beatBH}/${a.n}  beatCash ${a.beatCash}/${a.n}  avgDD ${(100*a.dd/a.n).toFixed(0)}%  avgSw ${(a.sw/a.n).toFixed(0)}`);
}
