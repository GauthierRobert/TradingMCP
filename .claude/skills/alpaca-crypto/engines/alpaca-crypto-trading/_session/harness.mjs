// Re-validation + live-decision harness for Alpaca crypto trading.
// Fetches public Alpaca crypto bars (no auth needed), runs the bundled engine.
// Timeframe-aware: pass a timeframe ("1Hour" | "15Min") and minutes-per-candle.
import { classifyRegime, runBacktest, farsSignal, FARS_CFG } from '../engine.mjs';

const LOC = 'us';
const DATA = 'https://data.alpaca.markets/v1beta3/crypto';

async function fetchBars(symbol, timeframe = '1Hour', { limit = 1000, start, end } = {}) {
  const all = [];
  let pageToken = null;
  do {
    const u = new URL(`${DATA}/${LOC}/bars`);
    u.searchParams.set('symbols', symbol);
    u.searchParams.set('timeframe', timeframe);
    u.searchParams.set('limit', String(Math.min(10000, limit)));
    if (start) u.searchParams.set('start', start);
    if (end) u.searchParams.set('end', end);
    if (pageToken) u.searchParams.set('page_token', pageToken);
    const r = await fetch(u);
    if (!r.ok) throw new Error(`${symbol} ${r.status} ${await r.text()}`);
    const j = await r.json();
    const bars = (j.bars && j.bars[symbol]) || [];
    all.push(...bars);
    pageToken = j.next_page_token;
  } while (pageToken && all.length < limit);
  return all.map(b => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v, t: b.t }));
}

function daysAgoISO(d) { return new Date(Date.now() - d * 864e5).toISOString(); }

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'validate') {
  // args: symbols  daysBack  [timeframe=1Hour]  [mpc=60]
  const symbols = (args[0] || 'BTC/USD,ETH/USD,SOL/USD').split(',');
  const daysBack = +(args[1] || 60);
  const timeframe = args[2] || '1Hour';
  const mpc = +(args[3] || 60);
  const start = daysAgoISO(daysBack);
  const lambdas = (args[4] ? args[4].split(',').map(Number) : [0.0035, 0.005, 0.007, 0.010, 0.015, 0.020, 0.030]);
  for (const sym of symbols) {
    const candles = await fetchBars(sym, timeframe, { limit: 10000, start });
    const first = candles[0]?.t, last = candles[candles.length - 1]?.t;
    const regime = classifyRegime(candles, mpc);
    console.log(`\n=== ${sym}  (${candles.length} ${timeframe} bars, ${first} → ${last}) ===`);
    console.log(`current regime: ${regime}`);
    const bh = (candles[candles.length - 1].c / candles[0].c - 1) * 100;
    console.log(`buy&hold over window: ${bh.toFixed(2)}%`);
    console.log(`lambda  strat%    vsCash$   vsBH$    trades  maxDD    oracle%`);
    for (const lambda of lambdas) {
      const r = runBacktest(candles, { minutesPerCandle: mpc, fee: 0.0025, lambda });
      console.log(
        `${lambda.toFixed(4)}  ${r.strategy_return.padStart(7)}  ${String(r.vs_cash_usdt).padStart(8)}  ${String(r.vs_bh_usdt).padStart(7)}  ${String(r.trades).padStart(5)}   ${r.max_drawdown.padStart(6)}  ${r.oracle_return}`
      );
    }
  }
}

if (cmd === 'decide') {
  // args: symbol  daysBack  lambda  [timeframe=1Hour]  [mpc=60]
  const sym = args[0] || 'BTC/USD';
  const daysBack = +(args[1] || 60);
  const lambda = +(args[2] || 0.007);
  const timeframe = args[3] || '1Hour';
  const mpc = +(args[4] || 60);
  const bph = Math.max(1, Math.round(60 / mpc)); // bars per hour
  const candles = await fetchBars(sym, timeframe, { limit: 10000, start: daysAgoISO(daysBack) });
  const N = candles.length;
  const regime = classifyRegime(candles, mpc);
  const last = candles[N - 1];
  const ago = (h) => candles[Math.max(0, N - 1 - h * bph)].c;
  const ret1h = (last.c / ago(1) - 1) * 100;
  const ret6h = (last.c / ago(6) - 1) * 100;
  const ret24h = (last.c / ago(24) - 1) * 100;
  const win24 = candles.slice(-24 * bph);
  const hi24 = Math.max(...win24.map(c => c.h));
  const lo24 = Math.min(...win24.map(c => c.l));
  const posInBand = ((last.c - lo24) / (hi24 - lo24) * 100);
  const r = runBacktest(candles, { minutesPerCandle: mpc, fee: 0.0025, lambda });
  console.log(JSON.stringify({
    symbol: sym, timeframe, bars: N, lastClose: last.c, lastBarTime: last.t,
    regime, ret1h: +ret1h.toFixed(2), ret6h: +ret6h.toFixed(2), ret24h: +ret24h.toFixed(2),
    hi24, lo24, posInBand24: +posInBand.toFixed(1),
    engine: { lambda, strategy_return: r.strategy_return, vs_cash: r.vs_cash_usdt, vs_bh: r.vs_bh_usdt, trades: r.trades, family_blocks: r.family_blocks },
    recentOrders: r.orders.slice(-4),
  }, null, 2));
}

if (cmd === 'fars') {
  // LIVE fee-aware reversion-scalper decision (validated gated rule).
  // args: symbol  daysBack  [timeframe=1Hour]  [mpc=60]  [long?]  [entryPx]  [heldBars]
  const sym = args[0] || 'ETH/USD';
  const daysBack = +(args[1] || 30);
  const timeframe = args[2] || '1Hour';
  const candles = await fetchBars(sym, timeframe, { limit: 10000, start: daysAgoISO(daysBack) });
  const position = { long: args[4] === 'long', entryPx: +(args[5] || 0), heldBars: +(args[6] || 0) };
  const sig = farsSignal(candles, position, FARS_CFG);
  console.log(JSON.stringify({ symbol: sym, timeframe, bars: candles.length,
    lastBarTime: candles[candles.length - 1]?.t, position, cfg: FARS_CFG, signal: sig }, null, 2));
}

if (cmd === 'bounce') {
  // RSI-reversal + EMA-reclaim bounce check. args: symbol  daysBack  [timeframe=1Hour]  [mpc=60]
  const sym = args[0] || 'ETH/USD';
  const daysBack = +(args[1] || 15);
  const timeframe = args[2] || '1Hour';
  const c = await fetchBars(sym, timeframe, { limit: 10000, start: daysAgoISO(daysBack) });
  const close = c.map(x => x.c), N = close.length;
  const P = 14;
  const rsiAt = (idx) => {
    let G = 0, L = 0; for (let i = idx - P + 1; i <= idx; i++) { const d = close[i] - close[i - 1]; if (d > 0) G += d; else L -= d; }
    const AG = G / P, AL = L / P; return AL === 0 ? 100 : 100 - 100 / (1 + AG / AL);
  };
  const rsiNow = rsiAt(N - 1), rsiPrev = rsiAt(N - 2), rsi2 = rsiAt(N - 3);
  const span = 12, a = 2 / (span + 1); let e = close[0];
  for (let i = 1; i < N; i++) e = a * close[i] + (1 - a) * e;
  const emaNow = e;
  const crossedUp30 = (rsiPrev <= 32 || rsi2 <= 32) && rsiNow > rsiPrev;
  const reclaimEma = close[N - 1] > emaNow;
  console.log(JSON.stringify({
    symbol: sym, timeframe, lastClose: +close[N - 1].toFixed(4), ema12: +emaNow.toFixed(4),
    rsi_t2: +rsi2.toFixed(1), rsi_prev: +rsiPrev.toFixed(1), rsi_now: +rsiNow.toFixed(1),
    crossedUpThrough30: crossedUp30, reclaimedEma12: reclaimEma,
    bounceEntry: crossedUp30 && reclaimEma,
  }, null, 2));
}
