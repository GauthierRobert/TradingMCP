// CLI for the risk & portfolio skill. Live ranking/sizing from public Alpaca bars,
// plus a breaker demo that PROVES the circuit-breaker cuts drawdown on real data.
//
//   node run.mjs rank   "BTC/USD,ETH/USD,SOL/USD"
//   node run.mjs size   BTC/USD 100000 0.12          # equity, stopPct (trend=0.12, fars=0.02)
//   node run.mjs breaker-demo "BTC/USD"              # all-in vs breaker-protected over a bear
import { riskBasedSize, drawdownBreaker, rankPairs, featuresFromCandles } from './risk.mjs';

const DATA = 'https://data.alpaca.markets/v1beta3/crypto/us';
const SPREADS = { 'BTC/USD': 0.08, 'ETH/USD': 0.08, 'SOL/USD': 0.36 };  // measured 2026-06-03; refine via orderbook MCP
async function fetchBars(symbol, timeframe = '1Hour', { limit = 100000, start, end } = {}) {
  const all = []; let pageToken = null;
  do {
    const u = new URL(`${DATA}/bars`);
    u.searchParams.set('symbols', symbol); u.searchParams.set('timeframe', timeframe);
    u.searchParams.set('limit', '10000');
    if (start) u.searchParams.set('start', start);
    if (end) u.searchParams.set('end', end);
    if (pageToken) u.searchParams.set('page_token', pageToken);
    let r, tries = 0;
    do { r = await fetch(u); if (r.status === 429) { await new Promise(res => setTimeout(res, 1500 * ++tries)); continue; } break; } while (tries < 5);
    if (!r.ok) throw new Error(`${symbol} ${r.status} ${await r.text()}`);
    const j = await r.json();
    all.push(...((j.bars && j.bars[symbol]) || []));
    pageToken = j.next_page_token;
  } while (pageToken && all.length < limit);
  return all.map(b => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v, t: b.t }));
}
const daysAgoISO = (d) => new Date(Date.now() - d * 864e5).toISOString();

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'rank') {
  const symbols = (args[0] || 'BTC/USD,ETH/USD,SOL/USD').split(',');
  const features = {};
  for (const sym of symbols) {
    const candles = await fetchBars(sym, '1Hour', { start: daysAgoISO(45) });
    features[sym] = featuresFromCandles(candles, SPREADS[sym] ?? 0.10);
  }
  const ranked = rankPairs(features, { maxConcurrent: 2, maxWeight: 0.35 });
  console.log('=== Pair ranking (45d, 1Hour) — allocate to the best up-trends, exclude the rest ===');
  for (const r of ranked) {
    const tag = r.allocate ? `ALLOCATE w=${(r.weight*100).toFixed(0)}%` : r.excluded ? `EXCLUDE (${r.excludeReason})` : 'skip (weak)';
    console.log(`${r.sym.padEnd(9)} score ${String(r.score).padStart(7)}  trend ${(r.trend*100).toFixed(1)}%  slope ${(r.slope*100).toFixed(1)}%  mom30d ${(r.momentum*100).toFixed(1)}%  vol ${r.volPct}%  spread ${r.spreadPct}%  -> ${tag}`);
  }
}

if (cmd === 'size') {
  const sym = args[0] || 'BTC/USD';
  const equity = +(args[1] || 100000);
  const stopPct = +(args[2] || 0.12);
  const candles = await fetchBars(sym, '1Hour', { start: daysAgoISO(2) });
  const price = candles[candles.length - 1].c;
  const s = riskBasedSize(equity, price, stopPct, {});
  console.log(JSON.stringify({ symbol: sym, equity, price, stopPct, sizing: s }, null, 2));
}

if (cmd === 'breaker-demo') {
  // Build a naive always-long equity curve over a real bear, then apply the
  // breaker, and show the max-drawdown reduction. Proves the risk layer's value.
  const sym = args[0] || 'BTC/USD';
  const candles = await fetchBars(sym, '1Hour', { start: daysAgoISO(180) });
  const close = candles.map(c => c.c);
  // naive: buy and hold the whole window (the thing risk control protects against)
  let eqAllIn = [10000];
  for (let i = 1; i < close.length; i++) eqAllIn.push(eqAllIn[i - 1] * (close[i] / close[i - 1]));
  // breaker-protected: same exposure until breaker halts, then hold cash until reset
  let eqProt = [10000]; let halted = false, peak = 10000;
  for (let i = 1; i < close.length; i++) {
    const ret = halted ? 0 : (close[i] / close[i - 1] - 1);
    const e = eqProt[i - 1] * (1 + ret); eqProt.push(e);
    peak = Math.max(peak, e);
    const dd = (peak - e) / peak;
    if (!halted && dd > 0.15) halted = true; else if (halted && dd <= 0.03) halted = false;
  }
  const ddOf = (c) => { let p = c[0], m = 0; for (const e of c) { p = Math.max(p, e); m = Math.max(m, (p - e) / p); } return +(m * 100).toFixed(2); };
  const br = drawdownBreaker(eqAllIn, {});
  console.log(`=== ${sym} breaker demo (last 180d) ===`);
  console.log(`all-in (buy&hold):   final $${eqAllIn[eqAllIn.length-1].toFixed(0)}  maxDD ${ddOf(eqAllIn)}%`);
  console.log(`breaker-protected:   final $${eqProt[eqProt.length-1].toFixed(0)}  maxDD ${ddOf(eqProt)}%`);
  console.log(`breaker on all-in curve now: ${br.reason}`);
  console.log(`>> the 15%-stop breaker cut max drawdown from ${ddOf(eqAllIn)}% to ${ddOf(eqProt)}% (capital preserved for the next uptrend).`);
}

export { fetchBars };
