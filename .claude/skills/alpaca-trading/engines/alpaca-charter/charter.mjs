// charter.mjs — deterministic chart analysis for the alpaca-charter skill.
// Reads real Alpaca bars (crypto public / stocks auth'd IEX) on TWO timeframes (1Min + 5Min),
// computes STRUCTURE (swings, trend regime, S/R levels, volume profile, patterns, divergences)
// and emits a fee-aware trade plan as JSON. Claude renders the narrative; this file does the math.
//
//   node charter.mjs read  "BTC/USD"            # full two-timeframe chart read + plan
//   node charter.mjs read  "SPY"                # equities work too (needs ALPACA_API_KEY env)
//   node charter.mjs scan  "BTC/USD,ETH/USD"    # one-line verdict per symbol
//
// Fee floors: crypto (Alpaca) ~0.58% round-trip incl. spread; US equities ~0.08% (spread only).

const CRYPTO = 'https://data.alpaca.markets/v1beta3/crypto/us';
const STOCKS = 'https://data.alpaca.markets/v2/stocks';
const isCrypto = (s) => s.includes('/');
const feeFloorPct = (s) => isCrypto(s) ? 0.58 : 0.08;          // % round-trip cost to clear
const daysAgoISO = (d) => new Date(Date.now() - d * 864e5).toISOString();
const r4 = (x) => +x.toFixed(4);

async function fetchBars(symbol, timeframe, start) {
  const all = []; let pageToken = null;
  do {
    const base = isCrypto(symbol) ? `${CRYPTO}/bars` : `${STOCKS}/bars`;
    const u = new URL(base);
    u.searchParams.set('symbols', symbol); u.searchParams.set('timeframe', timeframe);
    u.searchParams.set('limit', '10000'); u.searchParams.set('start', start);
    if (!isCrypto(symbol)) u.searchParams.set('feed', 'iex');
    if (pageToken) u.searchParams.set('page_token', pageToken);
    const headers = isCrypto(symbol) ? {} : {
      'APCA-API-KEY-ID': process.env.ALPACA_API_KEY, 'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY };
    let r, tries = 0;
    do { r = await fetch(u, { headers }); if (r.status === 429) { await new Promise(res => setTimeout(res, 1500 * ++tries)); continue; } break; } while (tries < 5);
    if (!r.ok) throw new Error(`${symbol} ${timeframe} ${r.status} ${await r.text()}`);
    const j = await r.json();
    all.push(...((j.bars && j.bars[symbol]) || []));
    pageToken = j.next_page_token;
  } while (pageToken && all.length < 20000);
  return all.map(b => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v, t: b.t }));
}

// ---------- indicators (self-contained, causal) ----------
function ema(vals, n) { const k = 2 / (n + 1), out = [vals[0]]; for (let i = 1; i < vals.length; i++) out.push(vals[i] * k + out[i - 1] * (1 - k)); return out; }
function rsi(closes, n = 14) {
  const out = new Array(closes.length).fill(50); let g = 0, l = 0;
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0);
    if (i <= n) { g += up / n; l += dn / n; } else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; }
    out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  } return out;
}
function atr(bars, n = 14) {
  const out = new Array(bars.length).fill(0); let a = bars[0].h - bars[0].l;
  for (let i = 1; i < bars.length; i++) {
    const tr = Math.max(bars[i].h - bars[i].l, Math.abs(bars[i].h - bars[i - 1].c), Math.abs(bars[i].l - bars[i - 1].c));
    a = (a * (n - 1) + tr) / n; out[i] = a;
  } return out;
}
function macdHist(closes, f = 12, s = 26, sig = 9) {
  const m = ema(closes, f).map((v, i) => v - ema(closes, s)[i]); const sl = ema(m, sig);
  return m.map((v, i) => v - sl[i]);
}
function bollinger(closes, n = 20, k = 2) {
  const out = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < n - 1) { out.push({ mid: closes[i], up: closes[i], lo: closes[i], bw: 0 }); continue; }
    const w = closes.slice(i - n + 1, i + 1), mu = w.reduce((a, b) => a + b) / n;
    const sd = Math.sqrt(w.reduce((a, b) => a + (b - mu) ** 2, 0) / n);
    out.push({ mid: mu, up: mu + k * sd, lo: mu - k * sd, bw: mu ? (2 * k * sd) / mu : 0 });
  } return out;
}

// ---------- structure ----------
// ZigZag swings: a swing confirms when price reverses by >= max(1.2*ATR%, minPct) from the extreme.
function swings(bars, atrArr, minPct = 0.1) {
  const out = []; if (bars.length < 3) return out;
  let dir = 0, extIdx = 0;
  for (let i = 1; i < bars.length; i++) {
    const dev = Math.max(1.2 * (atrArr[i] / bars[i].c) * 100, minPct) / 100;
    if (dir >= 0 && bars[i].h > bars[extIdx].h) extIdx = i;
    if (dir <= 0 && bars[i].l < bars[extIdx].l) extIdx = i;
    if (dir >= 0 && bars[i].c < bars[extIdx].h * (1 - dev)) { out.push({ type: 'H', i: extIdx, px: bars[extIdx].h, t: bars[extIdx].t }); dir = -1; extIdx = i; }
    else if (dir <= 0 && bars[i].c > bars[extIdx].l * (1 + dev)) { out.push({ type: 'L', i: extIdx, px: bars[extIdx].l, t: bars[extIdx].t }); dir = 1; extIdx = i; }
  }
  return out;
}
function trendFromSwings(sw) {
  const hs = sw.filter(s => s.type === 'H').slice(-2), ls = sw.filter(s => s.type === 'L').slice(-2);
  if (hs.length < 2 || ls.length < 2) return 'UNDEFINED';
  const hh = hs[1].px > hs[0].px, hl = ls[1].px > ls[0].px;
  if (hh && hl) return 'UPTREND (HH+HL)';
  if (!hh && !hl) return 'DOWNTREND (LH+LL)';
  return 'RANGE / transition';
}
// Cluster swing extremes into S/R levels; strength = touches, weighted by recency.
function srLevels(sw, bars, atrArr, maxLevels = 6) {
  const lastAtr = atrArr[atrArr.length - 1], tol = 0.6 * lastAtr;
  const pts = sw.map(s => ({ px: s.px, i: s.i }));
  const clusters = [];
  for (const p of pts) {
    const c = clusters.find(c => Math.abs(c.px - p.px) <= tol);
    if (c) { c.px = (c.px * c.n + p.px) / (c.n + 1); c.n++; c.lastI = Math.max(c.lastI, p.i); }
    else clusters.push({ px: p.px, n: 1, lastI: p.i });
  }
  const N = bars.length;
  return clusters
    .map(c => ({ px: r4(c.px), touches: c.n, score: r4(c.n * (0.5 + 0.5 * c.lastI / N)) }))
    .sort((a, b) => b.score - a.score).slice(0, maxLevels)
    .sort((a, b) => a.px - b.px);
}
// Simple volume profile: 30 price bins over the window -> point of control + top nodes.
function volumeProfile(bars, bins = 30) {
  const lo = Math.min(...bars.map(b => b.l)), hi = Math.max(...bars.map(b => b.h));
  if (hi <= lo) return { poc: bars[bars.length - 1].c, nodes: [] };
  const vol = new Array(bins).fill(0), w = (hi - lo) / bins;
  for (const b of bars) { const k = Math.min(bins - 1, Math.floor((b.c - lo) / w)); vol[k] += b.v; }
  const order = vol.map((v, k) => ({ v, px: r4(lo + (k + 0.5) * w) })).sort((a, b) => b.v - a.v);
  return { poc: order[0].px, nodes: order.slice(0, 3).map(n => n.px) };
}
// RSI divergence vs the last two same-type swings.
function divergence(sw, rsiArr) {
  const hs = sw.filter(s => s.type === 'H').slice(-2), ls = sw.filter(s => s.type === 'L').slice(-2);
  let bear = null, bull = null;
  if (hs.length === 2 && hs[1].px > hs[0].px && rsiArr[hs[1].i] < rsiArr[hs[0].i]) bear = 'price HH but RSI LH (bearish divergence)';
  if (ls.length === 2 && ls[1].px < ls[0].px && rsiArr[ls[1].i] > rsiArr[ls[0].i]) bull = 'price LL but RSI HL (bullish divergence)';
  return { bear, bull };
}
function candlePatterns(bars) {
  const n = bars.length, out = [];
  if (n < 3) return out;
  const a = bars[n - 2], b = bars[n - 1];
  const body = (x) => Math.abs(x.c - x.o), range = (x) => x.h - x.l || 1e-9;
  if (b.c > b.o && a.c < a.o && b.c > a.o && b.o < a.c) out.push('bullish engulfing');
  if (b.c < b.o && a.c > a.o && b.c < a.o && b.o > a.c) out.push('bearish engulfing');
  if ((b.h - Math.max(b.c, b.o)) > 2 * body(b) && body(b) / range(b) < 0.35) out.push('upper-wick rejection (pin)');
  if ((Math.min(b.c, b.o) - b.l) > 2 * body(b) && body(b) / range(b) < 0.35) out.push('lower-wick rejection (hammer)');
  if (body(b) / range(b) < 0.12) out.push('doji (indecision)');
  return out;
}

// ---------- one-timeframe read ----------
function readTF(bars, label) {
  const closes = bars.map(b => b.c);
  const atrArr = atr(bars), rsiArr = rsi(closes), hist = macdHist(closes), bb = bollinger(closes);
  const e9 = ema(closes, 9), e21 = ema(closes, 21), e50 = ema(closes, 50);
  const i = bars.length - 1, px = closes[i];
  const sw = swings(bars, atrArr, label === '1Min' ? 0.08 : 0.15);
  const levels = srLevels(sw, bars, atrArr);
  const vp = volumeProfile(bars.slice(-Math.min(bars.length, 600)));
  const bwHistory = bb.slice(-100).map(x => x.bw).sort((a, b) => a - b);
  const bwPct = bwHistory.length ? bwHistory.findIndex(v => v >= bb[i].bw) / bwHistory.length : 0.5;
  const sup = levels.filter(l => l.px < px).pop() || null;
  const res = levels.find(l => l.px > px) || null;
  return {
    timeframe: label, bars: bars.length, lastBarTime: bars[i].t, price: px,
    trend: trendFromSwings(sw),
    emaStack: e9[i] > e21[i] && e21[i] > e50[i] ? 'bullish (9>21>50)' : e9[i] < e21[i] && e21[i] < e50[i] ? 'bearish (9<21<50)' : 'mixed',
    ema50SlopePct: r4(((e50[i] - e50[Math.max(0, i - 10)]) / e50[i]) * 100),
    rsi: r4(rsiArr[i]), macdHist: hist[i] > 0 ? (hist[i] > hist[i - 1] ? 'positive & rising' : 'positive, fading') : (hist[i] < hist[i - 1] ? 'negative & falling' : 'negative, recovering'),
    atrPct: r4((atrArr[i] / px) * 100),
    squeeze: bwPct < 0.2 ? `YES (bandwidth in lowest ${Math.round(bwPct * 100)}% of window — expansion likely)` : 'no',
    nearestSupport: sup, nearestResistance: res, srLevels: levels,
    volumeProfile: vp, divergence: divergence(sw, rsiArr), candlePatterns: candlePatterns(bars),
    lastSwings: sw.slice(-4).map(s => ({ type: s.type, px: r4(s.px), t: s.t })),
  };
}

// ---------- fee-aware plan (5Min = bias & levels, 1Min = timing) ----------
const isBiasUp = (tf5) => tf5.trend.startsWith('UPTREND') || (tf5.emaStack.startsWith('bullish') && tf5.ema50SlopePct > 0);
function makePlan(sym, tf5, tf1) {
  const px = tf1.price, fee = feeFloorPct(sym);
  const biasUp = isBiasUp(tf5);
  const biasDown = tf5.trend.startsWith('DOWNTREND') || (tf5.emaStack.startsWith('bearish') && tf5.ema50SlopePct < 0);
  const bias = biasUp ? 'LONG' : biasDown ? 'SHORT/AVOID (long-only book -> stay flat)' : 'NEUTRAL';
  const sup = tf5.nearestSupport, res = tf5.nearestResistance;
  let setup = null;
  if (biasUp && sup) {
    const atrAbs = (tf1.atrPct / 100) * px;
    const entry = r4(Math.max(sup.px, px - atrAbs));                  // pullback toward 5Min support, timed on 1Min
    const stop = r4(sup.px - 1.0 * (tf5.atrPct / 100) * px);          // below the level, 1x 5Min ATR of room
    const t1 = res ? res.px : r4(entry * (1 + 3 * fee / 100));
    const t2 = tf5.srLevels.filter(l => l.px > (res ? res.px : px))[0]?.px || r4(entry * (1 + 5 * fee / 100));
    const riskPct = ((entry - stop) / entry) * 100, rewardPct = ((t1 - entry) / entry) * 100;
    const rr = riskPct > 0 ? rewardPct / riskPct : 0;
    const clearsFees = rewardPct >= 3 * fee, goodRR = rr >= 2;
    setup = {
      type: 'pullback-to-support (5Min level, 1Min trigger)',
      trigger: `1Min: hold above ${entry} + reversal sign (hammer/engulfing or RSI turning up from <40)`,
      entry, stop, invalidation: `5Min close below ${stop}`,
      targets: [t1, t2], riskPct: r4(riskPct), rewardPct: r4(rewardPct), rr: r4(rr),
      feeFloorPct: fee, clearsFees, goodRR,
      verdict: clearsFees && goodRR ? 'TRADEABLE' : `NO-TRADE (${!clearsFees ? `target < 3x fee floor ${fee}%` : ''}${!clearsFees && !goodRR ? ' & ' : ''}${!goodRR ? `R:R ${r4(rr)} < 2` : ''})`,
    };
  }
  return {
    bias, biasReason: `5Min: ${tf5.trend}, EMA ${tf5.emaStack}, slope ${tf5.ema50SlopePct}%`,
    timing1Min: `1Min: ${tf1.trend}, RSI ${tf1.rsi}, patterns: ${tf1.candlePatterns.join(', ') || 'none'}`,
    setup,
    defaultVerdict: setup?.verdict === 'TRADEABLE' ? 'TRADEABLE — see setup' : 'NO-TRADE is the default; wait for price at a level with confirmed trigger',
  };
}

// ---------- entry gate for the scalpers (importable) ----------
// charterGate(sym): is the 5Min STRUCTURE long-friendly right now? Used by the scalpers' tick to
// suppress 1Min BUY entries when the medium-term chart says no. Exits are never gated.
// Fail-closed: any error -> allowLong=false (missing a trade is cheaper than a bad one).
export async function charterGate(sym) {
  try {
    const b5 = await fetchBars(sym, '5Min', daysAgoISO(7));
    if (b5.length < 60) return { allowLong: false, reason: `charter: only ${b5.length} 5Min bars (closed/stale)` };
    const tf5 = readTF(b5, '5Min');
    const allowLong = isBiasUp(tf5);
    return { allowLong, trend: tf5.trend, emaStack: tf5.emaStack, ema50SlopePct: tf5.ema50SlopePct,
      rsi5m: tf5.rsi, nearestResistance: tf5.nearestResistance?.px ?? null,
      reason: allowLong ? `5Min bias LONG (${tf5.trend}, EMA ${tf5.emaStack})`
                        : `5Min bias not LONG (${tf5.trend}, EMA ${tf5.emaStack}, slope ${tf5.ema50SlopePct}%)` };
  } catch (e) {
    return { allowLong: false, reason: `charter error (fail-closed): ${String(e.message).slice(0, 80)}` };
  }
}
export { fetchBars, readTF, makePlan, feeFloorPct };

// ---------- CLI (only when run directly, not when imported by a scalper) ----------
const isMain = process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href;
const [cmd, symArg] = isMain ? process.argv.slice(2) : [];
if (cmd === 'read') {
  const sym = symArg || 'BTC/USD';
  const [b1, b5] = await Promise.all([
    fetchBars(sym, '1Min', daysAgoISO(1)),     // ~24h of 1Min  -> short-term read
    fetchBars(sym, '5Min', daysAgoISO(7)),     // ~7d  of 5Min  -> medium-term read
  ]);
  if (b1.length < 60 || b5.length < 60) throw new Error(`not enough bars (1Min=${b1.length}, 5Min=${b5.length}) — market closed?`);
  const tf1 = readTF(b1, '1Min'), tf5 = readTF(b5, '5Min');
  console.log(JSON.stringify({ symbol: sym, ts: new Date().toISOString(), feeFloorPct: feeFloorPct(sym),
    mediumTerm_5Min: tf5, shortTerm_1Min: tf1, plan: makePlan(sym, tf5, tf1) }, null, 2));
}
if (cmd === 'scan') {
  const syms = (symArg || 'BTC/USD,ETH/USD,SOL/USD').split(',');
  for (const sym of syms) {
    try {
      const [b1, b5] = await Promise.all([fetchBars(sym, '1Min', daysAgoISO(1)), fetchBars(sym, '5Min', daysAgoISO(7))]);
      const tf1 = readTF(b1, '1Min'), tf5 = readTF(b5, '5Min');
      const plan = makePlan(sym, tf5, tf1);
      console.log(`${sym.padEnd(9)} ${String(tf1.price).padStart(10)}  5m:${tf5.trend.padEnd(20)} 1m-RSI:${String(tf1.rsi).padStart(5)}  -> ${plan.setup?.verdict || plan.bias}`);
    } catch (e) { console.log(`${sym.padEnd(9)} ERROR ${e.message.slice(0, 80)}`); }
  }
}
if (isMain && !cmd) console.log('commands: read "BTC/USD" | scan "BTC/USD,ETH/USD,SPY"');
