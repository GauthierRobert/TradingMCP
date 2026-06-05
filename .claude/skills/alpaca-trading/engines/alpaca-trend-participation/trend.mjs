// Trend-participation engine (Skill #1). LONG/FLAT spot, fee-aware, causal.
//
// Thesis (validated below): on long/flat crypto the durable profit comes from
// PARTICIPATING in real uptrends and STEPPING ASIDE in downtrends — not from
// scalping chop (Alpaca's ~0.50% round-trip eats that edge). So: enter on a
// confirmed breakout inside an up regime, then HOLD and TRAIL — exit only when
// the trend itself breaks. Entries are rare, so fees stay tiny.
//
// Rule (all on close, causal):
//   regimeUp(i)  = close>emaSlow AND emaSlow rising over slopeBars
//   ENTRY flat->long: regimeUp AND emaFast>emaSlow AND close > Donchian-high(breakN prior bars)
//   HOLD/TRAIL:  stay long until close<emaSlow (trend break) OR
//                close < highestCloseSinceEntry*(1-trailPct) (chandelier giveback)
// Long/flat only; fee charged per fill.

export const TREND_CFG = {
  emaFast: 50, emaSlow: 200, slopeBars: 48, breakN: 72, trailPct: 0.12, fee: 0.0025,
};

function emaSeries(close, span) {
  const a = 2 / (span + 1), out = new Array(close.length); out[0] = close[0];
  for (let i = 1; i < close.length; i++) out[i] = a * close[i] + (1 - a) * out[i - 1];
  return out;
}

export function trendBacktest(candles, cfg = {}) {
  const c = { ...TREND_CFG, ...cfg };
  const close = candles.map(x => x.c), high = candles.map(x => x.h);
  const N = close.length;
  const ef = emaSeries(close, c.emaFast), es = emaSeries(close, c.emaSlow);
  const start = Math.max(c.emaSlow, c.slopeBars, c.breakN) + 1;
  let cash = 10000, units = 0, pos = 0, entryPx = 0, peakSince = 0;
  let trades = 0, fees = 0, wins = 0, losses = 0, peak = 10000, maxDD = 0, barsLong = 0;
  const orders = [];
  for (let i = start; i < N; i++) {
    const px = close[i];
    if (pos === 0) {
      const regimeUp = px > es[i] && es[i] > es[i - c.slopeBars];
      let donHigh = -Infinity;
      for (let k = i - c.breakN; k < i; k++) if (high[k] > donHigh) donHigh = high[k];
      if (regimeUp && ef[i] > es[i] && px > donHigh) {
        const f = cash * c.fee; units = (cash - f) / px; cash = 0; fees += f; pos = 1;
        entryPx = px; peakSince = px; trades++;
        orders.push({ i, t: candles[i].t, side: 'BUY', px: +px.toFixed(2) });
      }
    } else {
      barsLong++;
      if (px > peakSince) peakSince = px;
      const trendBreak = px < es[i];
      const trailHit = px < peakSince * (1 - c.trailPct);
      if (trendBreak || trailHit) {
        const proceeds = units * px, f = proceeds * c.fee; cash = proceeds - f; units = 0; fees += f; pos = 0;
        const up = px / entryPx - 1; if (up > 0) wins++; else losses++; trades++;
        orders.push({ i, t: candles[i].t, side: 'SELL', px: +px.toFixed(2), pnlPct: +(up * 100).toFixed(2),
          reason: trendBreak ? 'trend-break' : 'trail' });
      }
    }
    const e = cash + units * px; peak = Math.max(peak, e); maxDD = Math.max(maxDD, (peak - e) / peak);
  }
  if (pos === 1) { const pr = units * close[N - 1], f = pr * c.fee; cash = pr - f; fees += f; trades++; if (close[N-1] > entryPx) wins++; else losses++; }
  const finalEq = cash;
  const firstPx = close[start];
  const bh = (10000 * (1 - c.fee)) / firstPx * close[N - 1] * (1 - c.fee);
  return {
    finalEq: +finalEq.toFixed(2), ret: +((finalEq / 10000 - 1) * 100).toFixed(2),
    bhRet: +((bh / 10000 - 1) * 100).toFixed(2),
    vsCash: +(finalEq - 10000).toFixed(2), vsBH: +(finalEq - bh).toFixed(2),
    completedTrades: Math.floor(trades / 2), wins, losses,
    winRate: (wins + losses) ? +(100 * wins / (wins + losses)).toFixed(1) : 0,
    fees: +fees.toFixed(2), maxDD: +(maxDD * 100).toFixed(2),
    pctTimeInMarket: +(100 * barsLong / (N - start)).toFixed(1), orders,
  };
}

// LIVE decision for the latest bar. position = { long, entryPx, peakSince }.
export function trendSignal(candles, position = { long: false, entryPx: 0, peakSince: 0 }, cfg = {}) {
  const c = { ...TREND_CFG, ...cfg };
  const close = candles.map(x => x.c), high = candles.map(x => x.h), i = close.length - 1;
  const ef = emaSeries(close, c.emaFast), es = emaSeries(close, c.emaSlow);
  const px = close[i];
  const regimeUp = px > es[i] && es[i] > es[i - c.slopeBars];
  let donHigh = -Infinity; for (let k = i - c.breakN; k < i; k++) if (high[k] > donHigh) donHigh = high[k];
  const ctx = { px: +px.toFixed(4), emaFast: +ef[i].toFixed(2), emaSlow: +es[i].toFixed(2),
    regimeUp, donchianHigh: +donHigh.toFixed(2), aboveSlow: px > es[i], fastAboveSlow: ef[i] > es[i] };
  if (position.long) {
    const peakSince = Math.max(position.peakSince || position.entryPx, px);
    const trailStop = peakSince * (1 - c.trailPct);
    if (px < es[i]) return { action: 'SELL', reason: 'trend break: close < slow EMA', trailStop: +trailStop.toFixed(2), ...ctx };
    if (px < trailStop) return { action: 'SELL', reason: `chandelier trail hit (peak ${peakSince.toFixed(2)} -${(c.trailPct*100)}%)`, trailStop: +trailStop.toFixed(2), ...ctx };
    return { action: 'HOLD', reason: 'trend intact — ride it, do not churn', trailStop: +trailStop.toFixed(2), ...ctx };
  }
  if (regimeUp && ef[i] > es[i] && px > donHigh) return { action: 'BUY', reason: 'confirmed breakout in up regime', ...ctx };
  const why = !regimeUp ? 'regime not up (price below/rising-slow-EMA fails)' : ef[i] <= es[i] ? 'fast EMA not above slow' : 'no breakout (close <= Donchian high)';
  return { action: 'HOLD', reason: `stay FLAT — ${why}`, ...ctx };
}
