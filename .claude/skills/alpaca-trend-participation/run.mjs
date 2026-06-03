// CLI for the trend-participation skill. Fetches public Alpaca crypto bars
// (no auth) and runs trend.mjs. Long/flat spot, fee-aware, causal.
//
//   node run.mjs validate "BTC/USD,ETH/USD" 2023-10-01 2024-04-01 1Hour
//   node run.mjs windows  "BTC/USD"                                       # preset up/down/chop windows
//   node run.mjs decide   "BTC/USD" 30 1Hour [long entryPx peakSince]     # live signal
import { trendBacktest, trendSignal, TREND_CFG } from './trend.mjs';

const DATA = 'https://data.alpaca.markets/v1beta3/crypto/us';
async function fetchBars(symbol, timeframe = '1Hour', { limit = 100000, start, end } = {}) {
  const all = []; let pageToken = null;
  do {
    const u = new URL(`${DATA}/bars`);
    u.searchParams.set('symbols', symbol);
    u.searchParams.set('timeframe', timeframe);
    u.searchParams.set('limit', '10000');
    if (start) u.searchParams.set('start', start);
    if (end) u.searchParams.set('end', end);
    if (pageToken) u.searchParams.set('page_token', pageToken);
    let r, tries = 0;
    do {
      r = await fetch(u);
      if (r.status === 429) { await new Promise(res => setTimeout(res, 1500 * ++tries)); continue; }
      break;
    } while (tries < 5);
    if (!r.ok) throw new Error(`${symbol} ${r.status} ${await r.text()}`);
    const j = await r.json();
    all.push(...((j.bars && j.bars[symbol]) || []));
    pageToken = j.next_page_token;
  } while (pageToken && all.length < limit);
  return all.map(b => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v, t: b.t }));
}
const daysAgoISO = (d) => new Date(Date.now() - d * 864e5).toISOString();
const fmt = (n, w = 9) => String(n).padStart(w);

function row(label, r) {
  return `${label.padEnd(22)} ret ${fmt(r.ret + '%', 8)}  B&H ${fmt(r.bhRet + '%', 8)}  vsCash$ ${fmt(r.vsCash)}  vsBH$ ${fmt(r.vsBH)}  trades ${fmt(r.completedTrades, 3)}  win ${fmt(r.winRate + '%', 6)}  inMkt ${fmt(r.pctTimeInMarket + '%', 6)}  DD ${r.maxDD}%`;
}

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'validate') {
  const symbols = (args[0] || 'BTC/USD').split(',');
  const start = args[1], end = args[2], timeframe = args[3] || '1Hour';
  for (const sym of symbols) {
    const candles = await fetchBars(sym, timeframe, { start, end });
    const r = trendBacktest(candles, {});
    console.log(`\n=== ${sym} ${timeframe} ${start}→${end} (${candles.length} bars) ===`);
    console.log(row('trend-participation', r));
    if (r.orders.length) console.log('  trades:', r.orders.map(o => `${o.side}@${o.px}${o.pnlPct!==undefined?`(${o.pnlPct>0?'+':''}${o.pnlPct}%,${o.reason})`:''}`).join('  '));
  }
}

if (cmd === 'windows') {
  // Preset windows spanning bull, bear, and chop to test participation + protection.
  const sym = args[0] || 'BTC/USD';
  const W = [
    ['BULL  2023H2→24Q1', '2023-10-01T00:00:00Z', '2024-04-01T00:00:00Z'],
    ['BULL  2024Q4',      '2024-10-01T00:00:00Z', '2025-01-15T00:00:00Z'],
    ['BEAR  2022H2',      '2022-06-01T00:00:00Z', '2022-12-31T00:00:00Z'],
    ['BEAR  recent 180d', daysAgoISO(180),        undefined],
    ['CHOP  2023H1',      '2023-04-01T00:00:00Z', '2023-09-01T00:00:00Z'],
    ['FULL  3.9y',        '2022-06-01T00:00:00Z', undefined],
  ];
  console.log(`=== ${sym} 1Hour — trend-participation across regimes ===`);
  for (const [label, s, e] of W) {
    const candles = await fetchBars(sym, '1Hour', { start: s, end: e });
    if (candles.length < 250) { console.log(`${label.padEnd(22)} (only ${candles.length} bars — skip)`); continue; }
    const r = trendBacktest(candles, {});
    console.log(row(label, r));
  }
}

if (cmd === 'decide') {
  const sym = args[0] || 'BTC/USD';
  const daysBack = +(args[1] || 30);
  const timeframe = args[2] || '1Hour';
  const position = { long: args[3] === 'long', entryPx: +(args[4] || 0), peakSince: +(args[5] || 0) };
  const candles = await fetchBars(sym, timeframe, { start: daysAgoISO(daysBack) });
  const sig = trendSignal(candles, position, TREND_CFG);
  console.log(JSON.stringify({ symbol: sym, timeframe, bars: candles.length,
    lastBarTime: candles[candles.length - 1]?.t, position, cfg: TREND_CFG, signal: sig }, null, 2));
}

export { fetchBars };
