---
name: alpaca-risk-portfolio
description: Decide HOW MUCH to deploy and WHEN to stand down on Alpaca crypto — risk-based position sizing (risk a fixed % of equity given the engine's stop), a drawdown circuit-breaker that halts entries after a slump, and multi-pair ranking that allocates to the best uptrends and excludes structural losers. Venue-agnostic, fee-aware. Use to size any signal from alpaca-trend-participation / alpaca-regime-router and to cap risk. SIMULATION-ONLY by default (paper).
allowed-tools: mcp__alpaca__get_account_info, mcp__alpaca__get_all_positions, mcp__alpaca__get_open_position, mcp__alpaca__get_crypto_bars, mcp__alpaca__get_crypto_snapshot, mcp__alpaca__get_crypto_latest_orderbook, mcp__alpaca__place_crypto_order, mcp__alpaca__close_position, Read, Write, Bash
---

# Risk & portfolio — how much, and when to stand down

The layer that makes any signal survivable. It does **not** generate signals — it sizes them and
stops you from blowing up. Three jobs, all in `risk.mjs` (pure, venue-agnostic):

## 1. Risk-based position sizing — `riskBasedSize(equity, price, stopPct, opts)`

Risk a **fixed % of equity per trade** (default 1%), sized by the engine's actual stop distance, so
every trade risks the same dollars regardless of strategy:

| Engine | stop | $ risked (1% of $100k) | notional | weight |
|---|---|---|---|---|
| Trend (wide 12% trail) | 0.12 | $1,000 | **$8,000** | 8% |
| FARS (tight 2% stop) | 0.02 | $1,000 | **$35,000** (capped) | 35% |

Wide stop → small position; tight stop → bigger position, **capped at `maxWeight` (35%)** so one
trade can't dominate. This is risk parity: the stop sets the size, not a gut number.

## 2. Drawdown circuit-breaker — `drawdownBreaker(equityCurve, opts)`

Halt **new entries** once equity falls > `maxDDStop` (15%) from its peak; resume only after it
recovers within `recoverBand` (3%) of the peak. **Proven on real data** (`node run.mjs breaker-demo`):

> BTC last 180d — all-in drew down **35.7%** (ended $7,412); the 15%-stop breaker cut max drawdown to
> **15.7%** and ended **$9,118**. Same market, ~half the pain, capital preserved for the next uptrend.

Capital preservation is the whole game in a bear — this enforces it mechanically.

## 3. Portfolio ranking — `rankPairs(features, opts)` / `featuresFromCandles(candles, spread)`

Score each candidate pair by trend + momentum, penalize by **spread + volatility (the real cost)**,
**exclude** down-trends and wide-spread pairs, and hand back capped weights for the top
`maxConcurrent` (2). Current live read (`node run.mjs rank`, 2026-06-03): **all of BTC/ETH/SOL
EXCLUDED — every one is down-trend.** In a bear the correct allocation is *nothing*. SOL also carries
the spread penalty (0.36% vs 0.08%) that already disqualified it elsewhere in this project.

## Use it

```bash
node run.mjs rank   "BTC/USD,ETH/USD,SOL/USD"   # who to allocate to (and who to exclude)
node run.mjs size   BTC/USD 100000 0.12         # equity, stopPct (trend 0.12 / FARS 0.02)
node run.mjs breaker-demo "BTC/USD"             # prove the breaker cuts drawdown
```

For a **live** account, pull real numbers first: `get_account_info` for equity, the engine/router for
the stop distance, and `get_crypto_latest_orderbook` for the live spread (feed it into the ranking
instead of the static estimate). Then place `notional = sizing.notional` via `place_crypto_order`.

## How it fits the trio

1. **alpaca-regime-router** says WHICH engine / regime (or FLAT).
2. **alpaca-trend-participation** (or FARS) gives the BUY/SELL signal.
3. **This skill** sets the size (risk-based), checks the breaker (trade or stand down), and picks the
   pair (ranking). No order goes out un-sized or while the breaker is tripped.

## Guardrails

- Never size by gut — always `riskBasedSize` off the real stop. One trade ≤ `maxWeight` of equity.
- If the breaker is tripped, **do not enter** — wait for the recovery condition, even if a signal fires.
- Allocate only to ranked, non-excluded pairs; in a full down-tape that means **cash**.
- Paper by default; real orders need explicit user intent + a live-mode server. Re-measure spreads
  from the orderbook before sizing on a live account.
