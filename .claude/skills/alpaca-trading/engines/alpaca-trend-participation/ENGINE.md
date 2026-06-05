---
name: alpaca-trend-participation
description: Capture crypto UPTRENDS on Alpaca with a fee-aware trend-following engine (long/flat spot) — enter on a confirmed breakout inside an up regime, then HOLD and TRAIL, exit on trend break. Use when the market is trending up and you want to participate in the move (not scalp chop). This is the PROFIT engine of the trio; pair it with alpaca-regime-router (decides WHEN to run it) and alpaca-risk-portfolio (decides HOW MUCH). SIMULATION-ONLY by default (paper).
allowed-tools: mcp__alpaca__get_crypto_snapshot, mcp__alpaca__get_crypto_bars, mcp__alpaca__get_crypto_latest_bar, mcp__alpaca__get_crypto_latest_quote, mcp__alpaca__get_crypto_latest_orderbook, mcp__alpaca__get_account_info, mcp__alpaca__get_all_positions, mcp__alpaca__get_open_position, mcp__alpaca__get_orders, mcp__alpaca__place_crypto_order, mcp__alpaca__close_position, Read, Write, Bash
---

# Trend participation — the profit engine (long/flat, fee-aware)

**One job: catch real uptrends and ride them.** On long/flat crypto the durable profit comes
from *participating* in genuine uptrends, not from out-trading chop — Alpaca's ~0.50% round-trip
fee eats the scalping edge (proven in the sibling `alpaca-crypto-trading` skill). This engine does
the one thing that actually makes money: enter on a confirmed breakout **inside an up regime**,
then **hold and trail**, and exit only when the trend breaks.

> **Part of a trio.** This skill is the *engine*. It deliberately does NOT decide *when* it's safe
> to run — that's **`alpaca-regime-router`** (run trend only in an up regime; FLAT/FARS otherwise).
> Position size / risk is **`alpaca-risk-portfolio`**. Run alone only when you've separately
> confirmed an uptrend; otherwise let the router gate it.

> **SIMULATION-ONLY by default.** Paper account (`ALPACA_PAPER_TRADE=true`). Confirm before any
> order; never fire a live order to "test". Alpaca only — no other trading MCP from here.

## The rule (causal, on 1Hour closes)

- **Regime up** = `close > EMA(slow=200)` AND `EMA(slow)` rising over the last `slopeBars=48`.
- **ENTRY** (flat→long): regime up AND `EMA(fast=50) > EMA(slow)` AND `close > Donchian-high` of the
  prior `breakN=72` bars (a real breakout, not noise). → **BUY**.
- **HOLD / TRAIL**: stay long until either `close < EMA(slow)` (**trend break**) OR
  `close < highestClose-since-entry × (1 − trailPct=0.12)` (**chandelier giveback**). → then **SELL**.
- Entries are rare (trend changes are rare) so fees stay tiny. Do **not** churn on small pullbacks —
  the trail is intentionally wide so you ride the trend.

Config lives in `trend.mjs` as `TREND_CFG`. **Keep it fixed** — don't per-window fit (overfits).

## Evidence (Alpaca 1Hour, fee 0.25%/fill, measured 2026-06-03)

`node run.mjs windows "BTC/USD"` across regimes:

| Window | Engine ret | vs cash | vs B&H | trades | % time in mkt | Read |
|---|---|---|---|---|---|---|
| **BULL 2023H2→24Q1** | **+39.1%** | **+$3,909** | −$11,797 | 12 | 48% | participates hard ✅ |
| **BULL 2024Q4** | **+20.0%** | **+$2,002** | −$3,488 | 7 | 43% | participates ✅ |
| BEAR 2022H2 | −19.7% | −$1,974 | +$2,624 | 12 | 22% | bleeds; beats B&H |
| BEAR recent 180d | −13.5% | −$1,351 | +$1,258 | 10 | 23% | bleeds; beats B&H |
| CHOP 2023H1 | −2.2% | −$216 | +$501 | 7 | 20% | small bleed |

(ETH is similar: **+43% / +3%** in the two bull windows, −11% to −15% in bears.)

**What this proves:**
- The engine is a **real profit source in uptrends** (+20% to +43%) — the upside the flat-sitting
  setup was missing. It lags pure B&H (trend systems enter late and give back on the trail) but it
  *captures the move* while staying protected.
- It **bleeds −2% to −20% in bear/chop** (16–36% win rate, death by whipsaw). This is the known
  trend-following signature — **and it is the router's job to not deploy it there**, NOT a thing to
  tune out of the engine (tuning out bear losses overfits and kills bull capture).

**Bottom line:** run this when — and only when — the regime is genuinely up. Gated that way it is
the trio's money-maker; ungated over a full cycle it nets only modestly positive and lags B&H.

## Use it

```bash
node run.mjs windows  "BTC/USD"                              # re-validate across regimes
node run.mjs validate "BTC/USD,ETH/USD" 2023-10-01 2024-04-01 1Hour   # a specific window
node run.mjs decide   "BTC/USD" 30 1Hour [long entryPx peakSince]     # LIVE signal
```

`decide` returns `{action: BUY|SELL|HOLD, reason, regimeUp, donchianHigh, trailStop, ...}`. Pass the
trailing `long <entryPx> <peakSince>` when you already hold, so it can evaluate the trail/trend-break.

## Step — Act (paper by default)

On a BUY, size with `notional` (USD) via `place_crypto_order(symbol,'buy',...)`; on SELL use
`close_position(symbol)` to flatten. `type:"market"`, `time_in_force:"gtc"`. State side, price,
the ~0.25%/fill fee, and update paper P&L (gross/fees/net) — always benchmark vs cash AND B&H.
**Let `alpaca-risk-portfolio` set the size** rather than going all-in.

## Guardrails

- Long/flat only — no shorting crypto on Alpaca. In a downtrend the engine bleeds; **don't run it
  there** (that's the router's gate). Capital preservation = FLAT = the win in bears.
- Don't churn: the wide trail is deliberate. Exiting on every small pullback destroys the edge.
- Keep `TREND_CFG` fixed; re-validate with `node run.mjs windows` instead of re-fitting params.
- Paper by default; real orders need explicit user intent + a live-mode server.
