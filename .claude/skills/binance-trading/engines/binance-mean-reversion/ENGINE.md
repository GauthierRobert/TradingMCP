---
name: binance-mean-reversion
description: Symmetric mean-reversion engine for Binance SPOT — the COUNTERPART to the momentum scalpers. BUYS deeply oversold pairs (RSI<30) at the first confirmed bounce AND (simulation-only) SHORTS overbought pairs (RSI>70) at the first rejection, on a ~15-min resampled timeframe, exiting as price reverts toward its EMA mean. Acts in stretched tape (capitulations AND blowoff tops) where the trend-followers stay flat. 24/7, public klines (no auth for data), fee-aware (~0.20% round-trip). SIMULATION-FIRST (mirrors the BINANCE_TRADING_ENABLED posture); the short side is sim-only because spot has no shorting.
allowed-tools: Bash, Read, Write, Glob, Grep
---

# Mean-reversion (oversold / overbought) engine — Binance spot

The Binance momentum scalpers buy breakouts and stay flat in down/chop tape. This engine is the
deliberate opposite: it **buys oversold dips that start to bounce** and **fades overbought spikes**,
exiting back to the moving-average mean. Same symmetric logic as the Alpaca `alpaca-mean-reversion`
engine (it even shares the `emaArray`/`rsiArray` core from `binance-adaptive-scalper/scalper.mjs`),
re-pointed at Binance klines.

## ⚠️ Spot has no shorting — the short side is SIMULATION-ONLY

Binance **spot** cannot sell-to-open. So:
- **LONG (oversold)** — executes like the scalpers: simulated by default, real only with
  `BINANCE_TRADING_ENABLED=true` + keys (via the write-side CLI `cli/exec.mjs buy --quote`).
- **SHORT (overbought)** — **never places a real order.** It is tracked as a *simulated* short
  (paper entry/target/stop, P&L logged on `closed`) so you can see what the overbought-fade WOULD
  have done. Real shorting needs Binance **margin/futures**, which this spot skill does not touch.
  Set `enableShort:false` to drop it; the plan flags every short with `simOnly:true`.

## How a decision is made

1. Fetch ~20 days of public **1m** klines (no auth) and **resample to `tf` minutes** (default 15).
2. **Entry (flat)** — symmetric:
   - **LONG**: RSI dipped ≤ `entryRsi` (30) within `lookback` bars · RSI now > prior bar · bar closed
     in its upper range AND `c ≥ prevC` (**falling-knife guard**).
   - **SHORT [sim]**: RSI spiked ≥ `overboughtRsi` (70) within `lookback` bars · RSI now < prior bar ·
     bar closed in its lower range AND `c ≤ prevC` (**blowoff guard**).
3. **Target** = revert to `EMA(emaSpan)`, floored at `minTpPct`, capped at `tpCapPct`. Because the
   Binance round-trip **fee is ~0.20%** (vs the commission-free equity engine), `minTpPct` is wider
   (1.2%) so a winner actually clears costs.
4. **Stop** = beyond `stopPct` (3%, crypto needs room) or just past the swing low/high.
5. **Exit** = mean reached (RSI back to `exitRsi`/`exitRsiShort`), target, hard stop, time stop, or a
   `trailPct` trail once in profit. Exits never gated. Crypto is **24/7**; the only gate is data
   freshness (`staleMin`).

## Use it

```bash
cd .claude/skills/binance-trading/engines/binance-mean-reversion
node run.mjs scan   "BTCUSDT,ETHUSDT,SOLUSDT,AVAXUSDT,LINKUSDT,LTCUSDT,BCHUSDT,DOGEUSDT,DOTUSDT,XRPUSDT,AAVEUSDT,UNIUSDT"
node run.mjs decide "SOLUSDT"
node run.mjs tick   "BTCUSDT,ETHUSDT,..." 100000 brief
node run.mjs opened "SOLUSDT" long  140 7     # record a long fill (side px qty)
node run.mjs opened "SOLUSDT" short 160 7     # record a SIM short (side px qty)
node run.mjs closed "SOLUSDT" 150             # record the close -> logs net pnl (fee-adjusted)
node run.mjs review | status
```

## Wired into the tick procedure

SKILL.md's `tick` runs this engine after the adaptive scalper. Per tick: `node run.mjs tick
"<crypto basket>" 100000 brief`; for each plan item — `BUY` (long) → CLI `buy --quote` then
`run.mjs opened … long`; `SHORT` → **sim only**, just `run.mjs opened … short` (no CLI order);
`SELL`/`COVER` → CLI `sell --qty` (long) or `run.mjs closed` (sim cover). Ledger events-only.

## Guardrails & honest caveats

- **SIMULATION-FIRST.** Mirrors the Binance skill posture; nothing hits the trading API unless
  explicitly enabled, and the **short side never does** (spot limitation).
- **Mean-reversion fails in a real trend/capitulation/melt-up** — oversold can get more oversold for
  days. Guards + wide stops mitigate, not eliminate. **Not walk-forward validated** — let `review`
  accumulate fills before trusting it. Crypto's higher fee floor (~0.20% vs ~0.08% equities) means a
  thinner per-trade edge has to clear more.
- Default verdict is still **don't trade**: `neutral` / no-bounce / no-rejection are valid outputs.
- State in `_state/` (`params.json`, `positions.json`, `outcomes.ndjson`).
