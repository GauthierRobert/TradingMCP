---
name: alpaca-regime-router
description: The ignition switch for Alpaca crypto trading — classify the market regime each bar (UP / CHOP / DOWN) and route to the engine that wins there (trend-participation in uptrends, FLAT/cash in chop & downtrends, optional FARS in chop). Long/flat spot, fee-aware, causal. Use to decide WHICH strategy to run right now and to gate the trend engine so it only fires in confirmed uptrends. SIMULATION-ONLY by default (paper). Pairs with alpaca-trend-participation (the engine) and alpaca-risk-portfolio (the sizing).
allowed-tools: mcp__alpaca__get_crypto_snapshot, mcp__alpaca__get_crypto_bars, mcp__alpaca__get_crypto_latest_bar, mcp__alpaca__get_crypto_latest_quote, mcp__alpaca__get_account_info, mcp__alpaca__get_all_positions, mcp__alpaca__get_open_position, mcp__alpaca__place_crypto_order, mcp__alpaca__close_position, Read, Write, Bash
---

# Regime router — decide WHICH engine runs (and mostly: cash)

Classify the regime each bar and dispatch: **UP → trend-participation engine**, **DOWN → FLAT
(cash)**, **CHOP → FLAT by default** (or the gated FARS mean-reversion engine if `chopMode:'fars'`).
The router's two hard-won design rules:

1. **It gates ENTRIES, not exits.** Once an engine is long, that engine owns its exit (trail /
   trend-break). The router does **not** force-flat on a regime flicker — doing so yanks winners out
   at pullbacks and was measured to *destroy* return (−19% vs the engine's own −13% in a bear).
2. **Bias hard to cash.** "UP" is strict and carries a **monthly macro veto** (price above a rising
   ~30-day EMA). In anything short of a confirmed uptrend, the answer is **cash** — cash is a position.

> **SIMULATION-ONLY by default** (paper account). Alpaca only. Confirm before any order.

## The honest evidence — read this before trusting it

Tested on real Alpaca 1Hour bars, fee 0.25%/fill, `node run.mjs windows "BTC/USD"`:

| Window | Routed ret | vs cash | vs B&H | max DD | Read |
|---|---|---|---|---|---|
| BULL 2023H2→24Q1 | +23.1% | +$2,305 | −$7,181 | 13.9% | participates, lags B&H |
| BULL 2024Q4 | −2.6% | −$260 | −$913 | 12.5% | veto lag clipped a short bull |
| BEAR 2022H2 | −11.7% | −$1,168 | +$834 | 11.8% | beats B&H, **loses to cash** |
| BEAR recent 180d | −8.1% | −$805 | +$2,179 | 11.7% | beats B&H, loses to cash |
| CHOP 2023H1 | −2.6% | −$256 | +$220 | 3.0% | ≈ cash |
| **FULL 3.9y** | **−10 to −2%** | **negative** | **−$23k** | 35% | **trails BOTH cash and B&H** |

**What this proves (and what it does NOT):**
- The macro veto **slashes bear drawdown** — recent bear went −22%→−8%, 2022 bear all the way to
  *exactly cash* (0 trades) with a quarterly veto. As a **drawdown-control / risk-shaping gate it
  works**, and it beats buy-and-hold in every down/chop window (downside protection is real).
- **It does NOT manufacture alpha.** Over the full 3.9-year cycle the routed system trails both cash
  and buy-and-hold, and it does not beat *cash* in any single bear/chop window — the few "up"
  misclassifications during relief rallies have ~0% win rate and bleed. Stricter vetoes push the
  result toward cash (trade less) but never above it.
- **Blunt truth:** mechanical long/flat regime-timing on hourly crypto, net of Alpaca's ~0.50%
  round-trip, **does not beat buy-and-hold in a bull or cash in a bear.** The durable edges are only
  (a) downside protection vs B&H and (b) participating in *clearly* confirmed uptrends. Use the router
  to automate a conservative version of "be long only in obvious bulls, else cash" — not as a money
  printer. In a strong bull, the max-profit move is closer to buy-and-hold than to any timing system.

This is why the router is shipped as a **gate with honest defaults**, not a tuned backtest hero.
Don't per-window fit it (proven to overfit elsewhere in this project).

## The rule (causal, 1Hour)

- **UP** = weekly slow EMA(200) rising ≥1% over ~1wk **AND** price ≥1% above it **AND** monthly macro
  veto open (price above a rising ~30-day EMA(720)). → run the **trend engine** (entry only).
- **DOWN** = price below slow EMA and slow EMA falling. → **FLAT**.
- **CHOP** = everything else. → **FLAT** (default), or FARS if `chopMode:'fars'`.
- Once **long**, the active engine owns the exit (trend trail / trend-break; FARS tp/stop/timeout).

Config = `ROUTER_CFG` in `router.mjs`. Knobs: `longSpan`/`longSlopeBars` (veto horizon — longer =
safer & less upside; `1440/720` ≈ quarterly took the 2022 bear to exact cash), `chopMode` ('flat'|'fars'),
`slopeThresh`, `bandThresh`, `trailPct`.

## Use it

```bash
node run.mjs windows "BTC/USD"                 # routed across bull/bear/chop windows (default veto)
node run.mjs windows "BTC/USD" 1440 720 flat   # try a quarterly veto (longSpan longSlope chopMode)
node run.mjs compare "BTC/USD" 2022-06-01 -    # routed vs cash & B&H over the full span
node run.mjs decide  "BTC/USD" 45 1Hour [long entryPx peakSince heldBars]   # LIVE route
```

`decide` returns `{regime, engine, action, reason, ...}`. Current live read (2026-06-03): BTC regime
**DOWN → FLAT** (price ~67k, well below EMA50 68.7k / EMA200 72.2k). Cash is the call.

## Act (paper by default)

Follow the routed `action`: on BUY size via `alpaca-risk-portfolio` then `place_crypto_order` with
`notional`; on SELL use `close_position`. Always benchmark vs cash AND B&H, and log it. When in doubt,
the router's default and the evidence both say the same thing: **FLAT**.

## Guardrails

- Long/flat only. The router's entire value is *staying out* of bear/chop — honour it.
- Don't chase a prettier full-cycle number by loosening the veto; that just re-imports bear-rally
  whipsaw. If you want more bull capture, accept more drawdown — there is no free lunch here.
- Re-validate with `node run.mjs windows` after any change; never per-window fit the params.
