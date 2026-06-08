---
name: alpaca-mean-reversion
description: Symmetric mean-reversion engine for US equities & ETFs on Alpaca — the COUNTERPART to the momentum scalpers. It BUYS deeply oversold names (RSI<30) at the first confirmed bounce AND SHORTS overbought names (RSI>70) at the first rejection, on a resampled higher timeframe, exiting as price reverts toward its moving-average mean. Designed to ACT in stretched tape (selloffs AND blowoff tops) where the trend-followers correctly stay flat. Long/short/flat, commission-free (spread-only ~0.08% floor), IEX 1Min data resampled to ~15Min, market-hours gated, auth required. SIMULATION/paper by default.
allowed-tools: mcp__alpaca__*, Read, Write, Bash, Glob, Grep
---

# Mean-reversion (oversold-bounce) engine — acts where the momentum engines won't

The momentum scalpers (`alpaca-equity-scalper`, `alpaca-adaptive-scalper`) are **trend-followers**:
they buy breakouts to new highs and, by design, **stay flat in a downtrend** (no breakouts to take,
and the charter gate / regime router both veto longs). That is correct capital preservation — but it
means in a multi-day selloff the system does *nothing*. This engine is the deliberate opposite: a
**mean-reversion** strategy that buys **oversold** names showing the first sign of a bounce and exits
as they revert to the mean. It is the engine that *acts* in exactly the tape where the others sit out.

> **Why the same names, opposite verdict.** A momentum engine sees RSI 24 / new lows and says "no
> long." A mean-reversion engine sees RSI 24 + a bounce tick and says "buy the snap-back toward the
> mean." Both are valid; they just harvest opposite edges. Run them **together**, not instead of each
> other — the momentum engine carries up-trends, this one harvests down-trend bounces.

## How a decision is made

1. **Data**: fetch ~20 days of IEX **1Min** bars and **resample to `tf` minutes** (default 15) by
   clock bucket — a cleaner, less-noisy oversold read than raw 1Min (overnight gaps fall into
   separate buckets, no DST/holiday code).
2. **Entry (flat)** — symmetric; a LONG on oversold, a SHORT on overbought.
   - **LONG** — all three: RSI dipped ≤ `entryRsi` (30) within `lookback` bars · RSI now > prior bar
     (down-momentum fading) · the bar closed in its **upper** range AND `c ≥ prevC`. That last clause
     is the **falling-knife guard** — it refuses to buy while price is still dropping.
   - **SHORT** — the mirror (set `enableShort`): RSI spiked ≥ `overboughtRsi` (70) within `lookback`
     bars · RSI now < prior bar (up-momentum fading) · the bar closed in its **lower** range AND
     `c ≤ prevC` (the **blowoff guard** — won't short something still ripping higher).
3. **Target** = revert toward the **mean**: `EMA(emaSpan)` of the resampled closes, floored at
   `+minTpPct` and capped at `+tpCapPct`. (In oversold conditions price is *below* its EMA, so the
   mean is a natural upside target.)
4. **Stop** = the lower of `entry·(1−stopPct)` and just under the recent `swingLowN`-bar low.
   Mean-reversion needs room, so `stopPct` is wider (2.5%) than a momentum scalp.
5. **Exit (held)** — first of: RSI mean-reverted up to ≥ `exitRsi` (default 55), target reached,
   hard stop hit, time stop (`maxHoldBars`), or a `trailPct` trail once in profit. **Exits are never
   gated** — protective first.

Sizing is risk-based: `notional = equity · riskPct / stopPct`, capped at `maxWeight` of equity.

## No charter / regime gate — on purpose

The momentum engine's charter gate requires a **long-friendly 5Min uptrend** before a BUY. Applying
that here would block every oversold dip and defeat the entire strategy. Instead, the safety comes
from the **bounce-confirmation rule** (don't buy a falling knife) and the **wide stop + swing-low
stop**. This is the riskier engine of the family by nature — it leans *into* weakness — so it is
**paper-only by default** and should prove itself on logged fills before any real use.

## Use it

```bash
cd .claude/skills/alpaca-trading/engines/alpaca-mean-reversion
node run.mjs scan   "SPY,QQQ,IWM,GLD,SLV,USO,TLT,AAPL,MSFT,NVDA,AMZN,META"   # oversold candidates + would-buy
node run.mjs decide "SLV"                                                     # full signal for one symbol
node run.mjs tick   "SPY,QQQ,IWM,..." 100000 brief                           # autopilot plan per symbol
node run.mjs opened "AMZN" 244.3 61.4        # record an executed BUY fill (px qty) — stores target/stop
node run.mjs closed "AMZN" 246.3             # record an executed SELL fill -> logs net pnl
node run.mjs review                          # win-rate / avg net pnl from logged trades
node run.mjs status                          # params + open positions
```

## Wired into the autopilot tick

This engine **is** part of the `/alpaca-trading start` loop: SKILL.md's `tick` procedure runs it as
**step 3** (after the crypto + equity momentum scalpers), so the standing per-minute cron picks it up
automatically. Per tick it runs `node run.mjs tick "<equity basket>" 100000 brief`, executes any
`BUY` (long), `SHORT`, `SELL`/`COVER` via the deterministic CLI (`time_in_force:"day"`), records fills
with `opened`/`closed`, and ledgers events-only. To disable it, remove step 3 from SKILL.md or set
`enableShort:false` (short side only) / point its tick at an empty basket.

## Knobs (`_state/params.json`, written on first run)

`tf` 15 · `rsiP` 14 · `entryRsi` 30 · `lookback` 3 · `emaSpan` 20 · `tpCapPct` 0.04 · `minTpPct`
0.008 · `stopPct` 0.025 · `swingLowN` 6 · `exitRsi` 55 · `maxHoldBars` 26 · `trailPct` 0.02 ·
`riskPct` 0.01 · `maxWeight` 0.15 · `spreadEst` 0.0008. Tune in the file; re-`scan` to see the effect.

## Guardrails & honest caveats

- **Long/short/flat, paper by default.** It trades *into* extremes — inherently higher-risk than the
  trend engines. The **short side carries unbounded loss** if a squeeze runs against you; the blowoff
  guard, swing-high stop and time stop bound it, but shorting can also hit hard-to-borrow / locate
  limits on a real account (a non-issue on paper). Keep it paper until proven.
- **Mean-reversion fails in a true crash / melt-up / trend day** — an oversold name can get *more*
  oversold (and an overbought one *more* overbought) for days. The bounce/blowoff confirm rules and
  wide stops mitigate but do not eliminate this; size small and let logged fills (`review`) prove the
  edge before trusting it. **Not walk-forward validated.**
- **Fixed params, not yet a bandit.** Unlike the scalpers there's no self-tuning arm grid yet; v1 is a
  fixed (but configurable) ruleset that logs outcomes so a learner can be added later.
- **IEX partial feed** — keep the basket liquid; the spread floor assumes tight markets.
- State lives in `_state/` (`params.json`, `positions.json`, `outcomes.ndjson`) — it is the memory.
