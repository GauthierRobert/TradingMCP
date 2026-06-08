// Regime router + ensemble (Skill #2). LONG/FLAT spot, fee-aware, causal.
//
// The ignition switch: classify regime each bar, then dispatch to the engine that
// wins in that regime — TREND participation in uptrends, FARS (gated fee-aware
// mean-reversion) in chop, FLAT (cash) in downtrends. The thesis it must prove:
// routing beats (a) cash, (b) buy & hold, and (c) ANY single engine run everywhere.
//
// All rules are causal (only data <= i). Self-contained (no imports) so the skill
// stands alone; the engine rules mirror alpaca-trend-participation/trend.mjs and
// alpaca-crypto-trading/engine.mjs (FARS).

export const ROUTER_CFG = {
  fee: 0.0025,
  // regime classifier — STRICT 'up' to keep bear-rally noise from triggering the
  // trend engine. 'up' requires: price a clear band above the slow EMA, AND the
  // slow EMA itself rising by a minimum amount over the lookback, AND fast>slow.
  emaFast: 50, emaSlow: 200, slopeBars: 168,   // ~1 week lookback for the slope
  slopeThresh: 0.01,   // slow EMA must be up >=1% over slopeBars
  bandThresh: 0.01,    // price must be >=1% above slow EMA
  // MACRO VETO — the part that keeps us out of bear rallies. 'up' additionally
  // requires the MONTHLY trend to be up: price above a long EMA (~30d on 1h) that
  // is itself rising. In a sustained bear this stays false → we sit in cash.
  longSpan: 720, longSlopeBars: 336,   // ~30d EMA, ~14d slope lookback
  // chopMode: what to do when NOT in an up regime. 'flat' = sit in cash (the
  // validated default — cash beats both engines in bear/chop). 'fars' = run the
  // gated mean-reversion engine (only marginally additive; off by default).
  chopMode: 'flat',
  trend: { breakN: 72, trailPct: 0.12 },
  fars: { refSpan: 24, dipPct: 0.01, rsiBuy: 35, tp: 0.03, stop: 0.02, maxBars: 48, macroSpan: 240 },
};

function emaSeries(close, span) {
  const a = 2 / (span + 1), out = new Array(close.length); out[0] = close[0];
  for (let i = 1; i < close.length; i++) out[i] = a * close[i] + (1 - a) * out[i - 1];
  return out;
}
function rsiAt(close, idx, P = 14) {
  if (idx < P) return 50;
  let G = 0, L = 0;
  for (let i = idx - P + 1; i <= idx; i++) { const d = close[i] - close[i - 1]; if (d > 0) G += d; else L -= d; }
  const AG = G / P, AL = L / P; return AL === 0 ? 100 : 100 - 100 / (1 + AG / AL);
}

// Causal regime label: 'up' | 'down' | 'chop'. STRICT 'up' + monthly macro veto.
function classify(close, es, el, i, c) {
  if (i < c.longSpan + c.longSlopeBars) return 'chop';
  const slowUp = es[i] > es[i - c.slopeBars] * (1 + c.slopeThresh);   // weekly slow EMA rising
  const band = close[i] > es[i] * (1 + c.bandThresh);                  // price clearly above slow EMA
  const macroUp = close[i] > el[i] && el[i] > el[i - c.longSlopeBars]; // MONTHLY trend up (veto)
  if (slowUp && band && macroUp) return 'up';
  if (close[i] < es[i] && es[i] < es[i - c.slopeBars]) return 'down';
  return 'chop';
}

// Build a target-position function for a given engine, given current state.
// state = { pos, entryPx, peakSince, heldBars }.
function trendTarget(close, high, ef, es, i, st, c) {
  if (st.pos === 0) {
    let donHigh = -Infinity; for (let k = i - c.trend.breakN; k < i; k++) if (high[k] > donHigh) donHigh = high[k];
    const regimeUp = close[i] > es[i] && es[i] > es[i - c.slopeBars] && ef[i] > es[i];
    return (regimeUp && close[i] > donHigh) ? 1 : 0;
  }
  const peak = Math.max(st.peakSince, close[i]);
  if (close[i] < es[i] || close[i] < peak * (1 - c.trend.trailPct)) return 0;
  return 1;
}
function farsTarget(close, macro, i, st, c) {
  const f = c.fars;
  if (st.pos === 0) {
    const ref = emaCacheRef(close, f.refSpan)[i];
    const macroUp = i >= 24 && macro[i] > macro[i - 24] && close[i] > macro[i];
    const dip = close[i] <= ref * (1 - f.dipPct), oversold = rsiAt(close, i) < f.rsiBuy;
    return (macroUp && dip && oversold) ? 1 : 0;
  }
  const up = close[i] / st.entryPx - 1;
  if (up >= f.tp || up <= -f.stop || st.heldBars >= f.maxBars) return 0;
  return 1;
}
let _refCache = null, _refKey = null;
function emaCacheRef(close, span) {
  const key = close.length + ':' + span;
  if (_refKey !== key) { _refCache = emaSeries(close, span); _refKey = key; }
  return _refCache;
}

export function routedBacktest(candles, cfg = {}) {
  const c = { ...ROUTER_CFG, ...cfg, trend: { ...ROUTER_CFG.trend, ...(cfg.trend || {}) }, fars: { ...ROUTER_CFG.fars, ...(cfg.fars || {}) } };
  const close = candles.map(x => x.c), high = candles.map(x => x.h);
  const N = close.length;
  const ef = emaSeries(close, c.emaFast), es = emaSeries(close, c.emaSlow), macro = emaSeries(close, c.fars.macroSpan);
  const el = emaSeries(close, c.longSpan);
  const start = Math.max(c.emaSlow + c.slopeBars, c.longSpan + c.longSlopeBars, c.fars.macroSpan) + 1;
  let cash = 10000, units = 0, fees = 0, trades = 0, wins = 0, losses = 0, peak = 10000, maxDD = 0;
  const st = { pos: 0, entryPx: 0, peakSince: 0, heldBars: 0 };
  const regimeBars = { up: 0, down: 0, chop: 0 }, engineTrades = { trend: 0, fars: 0 };
  const orders = [];
  let activeEngine = null;
  for (let i = start; i < N; i++) {
    const px = close[i];
    const regime = classify(close, es, el, i, c); regimeBars[regime]++;
    if (st.pos === 1) st.heldBars++; if (st.pos === 1 && px > st.peakSince) st.peakSince = px;
    // Router gates ENTRIES by regime; once long, the ACTIVE engine owns its exit
    // (don't force-flat on a regime flicker — that fights the engine's own trail).
    let target, engine;
    if (st.pos === 1) {
      engine = activeEngine;
      target = engine === 'fars' ? farsTarget(close, macro, i, st, c) : trendTarget(close, high, ef, es, i, st, c);
    } else if (regime === 'up') {
      target = trendTarget(close, high, ef, es, i, st, c); engine = 'trend';
    } else if (regime === 'chop' && c.chopMode === 'fars') {
      target = farsTarget(close, macro, i, st, c); engine = 'fars';
    } else { target = 0; engine = 'flat'; }   // down, or chop+flat → stay CASH
    if (target !== st.pos) {
      if (target === 1) {
        const f = cash * c.fee; units = (cash - f) / px; cash = 0; fees += f;
        st.pos = 1; st.entryPx = px; st.peakSince = px; st.heldBars = 0; activeEngine = engine;
        if (engine !== 'flat') engineTrades[engine]++;
        orders.push({ i, t: candles[i].t, side: 'BUY', px: +px.toFixed(2), regime, engine });
      } else {
        const pr = units * px, f = pr * c.fee; cash = pr - f; units = 0; fees += f;
        const up = px / st.entryPx - 1; if (up > 0) wins++; else losses++;
        st.pos = 0;
        orders.push({ i, t: candles[i].t, side: 'SELL', px: +px.toFixed(2), pnlPct: +(up * 100).toFixed(2), regime, engine: activeEngine });
        activeEngine = null;
      }
      trades++;
    }
    const e = cash + units * px; peak = Math.max(peak, e); maxDD = Math.max(maxDD, (peak - e) / peak);
  }
  if (st.pos === 1) { const pr = units * close[N - 1], f = pr * c.fee; cash = pr - f; fees += f; trades++; if (close[N-1] > st.entryPx) wins++; else losses++; }
  const finalEq = cash;
  const firstPx = close[start];
  const bh = (10000 * (1 - c.fee)) / firstPx * close[N - 1] * (1 - c.fee);
  return {
    finalEq: +finalEq.toFixed(2), ret: +((finalEq / 10000 - 1) * 100).toFixed(2),
    bhRet: +((bh / 10000 - 1) * 100).toFixed(2),
    vsCash: +(finalEq - 10000).toFixed(2), vsBH: +(finalEq - bh).toFixed(2),
    completedTrades: Math.floor(trades / 2), winRate: (wins + losses) ? +(100 * wins / (wins + losses)).toFixed(1) : 0,
    fees: +fees.toFixed(2), maxDD: +(maxDD * 100).toFixed(2),
    regimeBars, engineTrades, orders,
  };
}

// LIVE route: classify the latest bar and say which engine + action.
export function routeSignal(candles, position = { long: false, entryPx: 0, peakSince: 0, heldBars: 0 }, cfg = {}) {
  const c = { ...ROUTER_CFG, ...cfg, trend: { ...ROUTER_CFG.trend, ...(cfg.trend || {}) }, fars: { ...ROUTER_CFG.fars, ...(cfg.fars || {}) } };
  const close = candles.map(x => x.c), high = candles.map(x => x.h), i = close.length - 1;
  const ef = emaSeries(close, c.emaFast), es = emaSeries(close, c.emaSlow), macro = emaSeries(close, c.fars.macroSpan);
  const el = emaSeries(close, c.longSpan);
  const regime = classify(close, es, el, i, c);
  const st = { pos: position.long ? 1 : 0, entryPx: position.entryPx || 0,
               peakSince: Math.max(position.peakSince || 0, close[i]), heldBars: position.heldBars || 0 };
  // If already long, the engine that opened it owns the exit. We can't always know
  // which engine that was from a stateless call, so infer: if regime is up use trend
  // exit; otherwise (held into chop/down) also use the trend exit (trail/trend-break)
  // since trend is the only engine that holds across regimes. FARS exits are fast.
  let engine, target;
  if (position.long) {
    engine = 'trend'; target = trendTarget(close, high, ef, es, i, st, c);
  } else if (regime === 'up') { engine = 'trend'; target = trendTarget(close, high, ef, es, i, st, c); }
  else if (regime === 'chop' && c.chopMode === 'fars') { engine = 'fars'; target = farsTarget(close, macro, i, st, c); }
  else { engine = 'flat'; target = 0; }
  let action = 'HOLD';
  if (target === 1 && !position.long) action = 'BUY';
  else if (target === 0 && position.long) action = 'SELL';
  const reason = regime === 'up' ? `UP regime → trend engine (${action})`
    : regime === 'down' ? 'DOWN regime → FLAT (cash is the position)'
    : `CHOP regime → ${c.chopMode === 'fars' ? `FARS (${action})` : 'FLAT (cash)'}`;
  return { regime, engine, action, reason, px: +close[i].toFixed(4),
    emaFast: +ef[i].toFixed(2), emaSlow: +es[i].toFixed(2), rsi: +rsiAt(close, i).toFixed(1) };
}
