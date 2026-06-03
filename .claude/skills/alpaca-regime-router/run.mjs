// CLI for the regime-router skill. Fetches public Alpaca crypto bars and runs the
// routed ensemble, comparing it head-to-head vs single engines, cash, and B&H.
//
//   node run.mjs compare "BTC/USD" 2022-06-01 -            # routed vs singles across the span
//   node run.mjs windows "BTC/USD"                         # routed across preset regimes
//   node run.mjs decide  "BTC/USD" 30 1Hour [long entryPx peakSince heldBars]
import { routedBacktest, routeSignal, ROUTER_CFG } from './router.mjs';

const DATA = 'https://data.alpaca.markets/v1beta3/crypto/us';
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
const fmt = (n, w = 9) => String(n).padStart(w);

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'compare') {
  const sym = args[0] || 'BTC/USD';
  const start = args[1] === '-' ? undefined : args[1];
  const end = args[2] === '-' ? undefined : args[2];
  const candles = await fetchBars(sym, '1Hour', { start: start || '2022-06-01T00:00:00Z', end });
  const routed = routedBacktest(candles, {});
  console.log(`\n=== ${sym} 1Hour  (${candles.length} bars, ${candles[0]?.t} → ${candles[candles.length-1]?.t}) ===`);
  console.log(`ROUTED ensemble:  ret ${fmt(routed.ret+'%',8)}  vsCash$ ${fmt(routed.vsCash)}  vsBH$ ${fmt(routed.vsBH)}  trades ${routed.completedTrades}  win ${routed.winRate}%  DD ${routed.maxDD}%`);
  console.log(`  B&H ${routed.bhRet}%  | regime bars: up ${routed.regimeBars.up}  chop ${routed.regimeBars.chop}  down ${routed.regimeBars.down}  | engine trades: trend ${routed.engineTrades.trend}  fars ${routed.engineTrades.fars}`);
  console.log(`  benchmarks: cash 0%  B&H ${routed.bhRet}%`);
}

if (cmd === 'windows') {
  const sym = args[0] || 'BTC/USD';
  // optional cfg overrides: args[1]=longSpan args[2]=longSlopeBars args[3]=chopMode
  const ov = {};
  if (args[1]) ov.longSpan = +args[1];
  if (args[2]) ov.longSlopeBars = +args[2];
  if (args[3]) ov.chopMode = args[3];
  const W = [
    ['BULL 2023H2→24Q1', '2023-10-01T00:00:00Z', '2024-04-01T00:00:00Z'],
    ['BULL 2024Q4',      '2024-10-01T00:00:00Z', '2025-01-15T00:00:00Z'],
    ['BEAR 2022H2',      '2022-06-01T00:00:00Z', '2022-12-31T00:00:00Z'],
    ['BEAR recent 180d', daysAgoISO(180),        undefined],
    ['CHOP 2023H1',      '2023-04-01T00:00:00Z', '2023-09-01T00:00:00Z'],
    ['FULL 3.9y',        '2022-06-01T00:00:00Z', undefined],
  ];
  console.log(`=== ${sym} 1Hour — ROUTED ensemble across regimes ===`);
  for (const [label, s, e] of W) {
    const candles = await fetchBars(sym, '1Hour', { start: s, end: e });
    if (candles.length < 300) { console.log(`${label.padEnd(18)} (only ${candles.length} bars — skip)`); continue; }
    const r = routedBacktest(candles, ov);
    console.log(`${label.padEnd(18)} ret ${fmt(r.ret+'%',8)}  B&H ${fmt(r.bhRet+'%',8)}  vsCash$ ${fmt(r.vsCash)}  vsBH$ ${fmt(r.vsBH)}  trades ${fmt(r.completedTrades,3)}  win ${fmt(r.winRate+'%',6)}  DD ${r.maxDD}%  [up${r.regimeBars.up}/ch${r.regimeBars.chop}/dn${r.regimeBars.down}]`);
  }
}

if (cmd === 'decide') {
  const sym = args[0] || 'BTC/USD';
  const daysBack = +(args[1] || 30);
  const timeframe = args[2] || '1Hour';
  const position = { long: args[3] === 'long', entryPx: +(args[4] || 0), peakSince: +(args[5] || 0), heldBars: +(args[6] || 0) };
  const candles = await fetchBars(sym, timeframe, { start: daysAgoISO(daysBack) });
  const sig = routeSignal(candles, position, ROUTER_CFG);
  console.log(JSON.stringify({ symbol: sym, timeframe, bars: candles.length,
    lastBarTime: candles[candles.length - 1]?.t, position, signal: sig }, null, 2));
}

export { fetchBars };
