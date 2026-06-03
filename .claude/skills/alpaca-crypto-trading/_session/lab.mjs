// Strategy lab — explore "fee-aware, must-act, take-profit-at-2x-fee" strategies
// on REAL Alpaca crypto bars, head-to-head vs the validated baseline engine, cash,
// and buy & hold. Long/flat spot only. Everything is causal (no lookahead).
//
// Goal: MAXIMUM net-of-fee profit. We only keep a strategy if it beats cash AND the
// baseline engine — and survives an out-of-sample (OOS) split (train on first 70%,
// report the held-out last 30% separately).
//
// Usage:
//   node lab.mjs sweep  "ETH/USD,BTC/USD,SOL/USD"  90  1Hour 60
//   node lab.mjs oos    "ETH/USD"                  120 1Hour 60
import { runBacktest } from '../engine.mjs';

const LOC = 'us';
const DATA = 'https://data.alpaca.markets/v1beta3/crypto';
const FEE = 0.0025;                 // Alpaca base-tier taker per fill
const RT = 2 * FEE;                 // round-trip fee (~0.50%)

async function fetchBars(symbol, timeframe = '1Hour', { limit = 10000, start, end } = {}) {
  const all = []; let pageToken = null;
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
    all.push(...((j.bars && j.bars[symbol]) || []));
    pageToken = j.next_page_token;
  } while (pageToken && all.length < limit);
  return all.map(b => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v, t: b.t }));
}
const daysAgoISO = (d) => new Date(Date.now() - d * 864e5).toISOString();

// ---------------------------------------------------------------------------
// Helpers (all causal)
function emaSeries(close, span) {
  const a = 2 / (span + 1), out = new Array(close.length); out[0] = close[0];
  for (let i = 1; i < close.length; i++) out[i] = a * close[i] + (1 - a) * out[i - 1];
  return out;
}
function rsiSeries(close, P = 14) {
  const out = new Array(close.length).fill(NaN);
  for (let idx = P; idx < close.length; idx++) {
    let G = 0, L = 0;
    for (let i = idx - P + 1; i <= idx; i++) { const d = close[i] - close[i - 1]; if (d > 0) G += d; else L -= d; }
    const AG = G / P, AL = L / P; out[idx] = AL === 0 ? 100 : 100 - 100 / (1 + AG / AL);
  }
  return out;
}

// ---------------------------------------------------------------------------
// STRATEGY: Fee-Aware Reversion Scalper (FARS) — the user's "must-act / take
// profit once it clears 2x fee" idea, made concrete and fee-disciplined.
//
//   - Reference "fair value" = EMA(refSpan).
//   - ENTRY (flat -> long): price dips dipPct below the reference EMA AND RSI is
//     oversold (< rsiBuy), i.e. buy weakness, not strength. Optional macro gate:
//     skip entries when the slow EMA is steeply falling (avoid catching knives).
//   - EXIT (long -> flat): take profit at +tp (tp >= 2*RT + buffer, so every
//     completed trade clears 2x the round-trip fee), OR stop out at -stop, OR
//     bail if held longer than maxBars without hitting either (free the capital).
//   - Long/flat only; fee charged on every fill.
function farsBacktest(candles, {
  refSpan = 24, dipPct = 0.01, rsiBuy = 35, tp = 0.012, stop = 0.02,
  maxBars = 48, macroSpan = 240, macroGate = true, startUsdt = 10000, fee = FEE,
} = {}) {
  const close = candles.map(c => c.c);
  const N = close.length;
  const ref = emaSeries(close, refSpan);
  const macro = emaSeries(close, macroSpan);
  const rsi = rsiSeries(close, 14);
  let cash = startUsdt, units = 0, pos = 0, entryPx = 0, heldBars = 0;
  let trades = 0, fees = 0, wins = 0, losses = 0;
  let peak = startUsdt, maxDD = 0;
  const eq = (px) => cash + units * px;
  const orders = [];
  for (let i = macroSpan + 1; i < N; i++) {
    const px = close[i];
    if (pos === 0) {
      const dip = px <= ref[i] * (1 - dipPct);
      const oversold = rsi[i] < rsiBuy;
      const macroOk = !macroGate || (macro[i] > macro[i - 24] && px > macro[i]); // only dip-buy in an UP macro trend (no knife-catching)
      if (dip && oversold && macroOk) {
        const f = cash * fee; units = (cash - f) / px; cash = 0; fees += f; pos = 1;
        entryPx = px; heldBars = 0; trades++;
        orders.push({ i, t: candles[i].t, side: 'BUY', px: +px.toFixed(2) });
      }
    } else {
      heldBars++;
      const up = px / entryPx - 1;
      const hitTP = up >= tp, hitStop = up <= -stop, timedOut = heldBars >= maxBars;
      if (hitTP || hitStop || timedOut) {
        const proceeds = units * px, f = proceeds * fee; cash = proceeds - f; units = 0; fees += f; pos = 0;
        if (up > 0) wins++; else losses++;
        trades++;
        orders.push({ i, t: candles[i].t, side: 'SELL', px: +px.toFixed(2), pnlPct: +(up * 100).toFixed(2),
          reason: hitTP ? 'TP' : hitStop ? 'STOP' : 'TIMEOUT' });
      }
    }
    const e = eq(px); peak = Math.max(peak, e); maxDD = Math.max(maxDD, (peak - e) / peak);
  }
  // close any open position at the end (mark-to-market, charge exit fee)
  if (pos === 1) { const proceeds = units * close[N - 1], f = proceeds * fee; cash = proceeds - f; fees += f; trades++; if (close[N-1] > entryPx) wins++; else losses++; }
  const finalEq = cash;
  const firstPx = close[macroSpan + 1] ?? close[0];
  const bh = (startUsdt * (1 - fee)) / firstPx * close[N - 1] * (1 - fee);
  return {
    finalEq: +finalEq.toFixed(2),
    ret: +((finalEq / startUsdt - 1) * 100).toFixed(2),
    vsCash: +(finalEq - startUsdt).toFixed(2),
    vsBH: +(finalEq - bh).toFixed(2),
    completedTrades: Math.floor(trades / 2), wins, losses,
    winRate: (wins + losses) ? +(100 * wins / (wins + losses)).toFixed(1) : 0,
    fees: +fees.toFixed(2), maxDD: +(maxDD * 100).toFixed(2),
    orders,
  };
}

// Baseline engine result for the same window (the validated current strategy).
function baseline(candles, mpc, lambda = 0.007) {
  const r = runBacktest(candles, { minutesPerCandle: mpc, fee: FEE, lambda });
  return { ret: parseFloat(r.strategy_return), vsCash: r.vs_cash_usdt, vsBH: r.vs_bh_usdt,
           trades: r.trades, fees: r.total_fees_usdt, maxDD: parseFloat(r.max_drawdown) };
}

function fmt(n, w = 8) { return String(n).padStart(w); }

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'sweep') {
  const symbols = (args[0] || 'ETH/USD,BTC/USD,SOL/USD').split(',');
  const daysBack = +(args[1] || 90);
  const timeframe = args[2] || '1Hour';
  const mpc = +(args[3] || 60);
  // tp must clear 2x round-trip (=4*fee=1.0%); sweep a small grid around it.
  const grid = [];
  for (const dipPct of [0.006, 0.01, 0.015])
    for (const tp of [0.012, 0.02, 0.03])
      for (const stop of [0.02, 0.035])
        for (const macroGate of [true, false])
          grid.push({ dipPct, tp, stop, macroGate, rsiBuy: 35, refSpan: 24, maxBars: 48 });
  for (const sym of symbols) {
    const candles = await fetchBars(sym, timeframe, { start: daysAgoISO(daysBack) });
    const bh = (candles[candles.length - 1].c / candles[0].c - 1) * 100;
    const base = baseline(candles, mpc);
    console.log(`\n=== ${sym}  (${candles.length} ${timeframe} bars, ${daysBack}d)  B&H ${bh.toFixed(1)}% ===`);
    console.log(`BASELINE engine(λ0.007):  ret ${fmt(base.ret+'%',7)}  vsCash$${fmt(base.vsCash)}  trades ${base.trades}  DD ${base.maxDD}%`);
    console.log(`dip%   tp%   stop%  gate   ret%    vsCash$   vsBH$   trades  win%   DD%   fees$`);
    // rank by vsCash
    const rows = grid.map(g => ({ g, r: farsBacktest(candles, { ...g, minutesPerCandle: mpc }) }))
      .sort((a, b) => b.r.vsCash - a.r.vsCash);
    for (const { g, r } of rows.slice(0, 8)) {
      console.log(`${fmt((g.dipPct*100).toFixed(1),4)}  ${fmt((g.tp*100).toFixed(1),4)}  ${fmt((g.stop*100).toFixed(1),5)}  ${g.macroGate?'on ':'off'}  ${fmt(r.ret+'%',6)}  ${fmt(r.vsCash)}  ${fmt(r.vsBH)}  ${fmt(r.completedTrades,5)}  ${fmt(r.winRate,4)}  ${fmt(r.maxDD,4)}  ${fmt(r.fees)}`);
    }
  }
}

if (cmd === 'oos') {
  // Train on first 70%, pick best-by-vsCash params, then report held-out last 30%.
  const symbols = (args[0] || 'ETH/USD').split(',');
  const daysBack = +(args[1] || 120);
  const timeframe = args[2] || '1Hour';
  const mpc = +(args[3] || 60);
  const grid = [];
  for (const dipPct of [0.006, 0.01, 0.015])
    for (const tp of [0.012, 0.02, 0.03])
      for (const stop of [0.02, 0.035])
        for (const macroGate of [true, false])
          grid.push({ dipPct, tp, stop, macroGate, rsiBuy: 35, refSpan: 24, maxBars: 48 });
  for (const sym of symbols) {
    const candles = await fetchBars(sym, timeframe, { start: daysAgoISO(daysBack) });
    const split = Math.floor(candles.length * 0.7);
    const train = candles.slice(0, split), test = candles.slice(split);
    const best = grid.map(g => ({ g, r: farsBacktest(train, { ...g, minutesPerCandle: mpc }) }))
      .sort((a, b) => b.r.vsCash - a.r.vsCash)[0];
    const oos = farsBacktest(test, { ...best.g, minutesPerCandle: mpc });
    const baseTest = baseline(test, mpc);
    const bhTest = (test[test.length - 1].c / test[0].c - 1) * 100;
    console.log(`\n=== ${sym}  OOS split (train ${train.length} / test ${test.length} bars) ===`);
    console.log(`picked-on-train: dip ${(best.g.dipPct*100).toFixed(1)}% tp ${(best.g.tp*100).toFixed(1)}% stop ${(best.g.stop*100).toFixed(1)}% gate ${best.g.macroGate}`);
    console.log(`  TRAIN  FARS: ret ${best.r.ret}%  vsCash$${best.r.vsCash}  trades ${best.r.completedTrades}  win ${best.r.winRate}%`);
    console.log(`  TEST   B&H:  ${bhTest.toFixed(2)}%`);
    console.log(`  TEST   base: ret ${baseTest.ret}%  vsCash$${baseTest.vsCash}  trades ${baseTest.trades}`);
    console.log(`  TEST   FARS: ret ${oos.ret}%  vsCash$${oos.vsCash}  vsBH$${oos.vsBH}  trades ${oos.completedTrades}  win ${oos.winRate}%  DD ${oos.maxDD}%`);
    console.log(`  >> OOS verdict: FARS ${oos.vsCash > 0 ? 'BEATS' : 'loses to'} cash; ${oos.vsCash > baseTest.vsCash ? 'BEATS' : 'loses to'} baseline.`);
  }
}

if (cmd === 'fixed') {
  // Apply ONE hardcoded, non-fit config blindly to each symbol's full window and
  // its held-out last 30%. No per-window selection -> no selection bias. This is
  // the fair test of a deployable fixed rule.
  const symbols = (args[0] || 'ETH/USD,BTC/USD,SOL/USD').split(',');
  const daysBack = +(args[1] || 120);
  const timeframe = args[2] || '1Hour';
  const mpc = +(args[3] || 60);
  const CFG = { dipPct: 0.01, tp: 0.03, stop: 0.02, macroGate: true, rsiBuy: 35, refSpan: 24, maxBars: 48 };
  console.log(`FIXED config (no fitting): dip ${CFG.dipPct*100}% tp ${CFG.tp*100}% stop ${CFG.stop*100}% gate ${CFG.macroGate} rsiBuy ${CFG.rsiBuy}`);
  console.log(`sym       window  ret%    vsCash$  vsBH$   trades win%   DD%   | OOS(last30%) ret%  vsCash$ trades`);
  for (const sym of symbols) {
    const candles = await fetchBars(sym, timeframe, { start: daysAgoISO(daysBack) });
    const full = farsBacktest(candles, { ...CFG, minutesPerCandle: mpc });
    const test = candles.slice(Math.floor(candles.length * 0.7));
    const oos = farsBacktest(test, { ...CFG, minutesPerCandle: mpc });
    console.log(`${sym.padEnd(8)}  ${daysBack}d   ${fmt(full.ret+'%',6)}  ${fmt(full.vsCash)}  ${fmt(full.vsBH)}  ${fmt(full.completedTrades,4)}  ${fmt(full.winRate,4)}  ${fmt(full.maxDD,4)}  | ${fmt(oos.ret+'%',6)}  ${fmt(oos.vsCash)}  ${fmt(oos.completedTrades,4)}`);
  }
}

export { farsBacktest, fetchBars };
