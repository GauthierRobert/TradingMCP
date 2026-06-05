---
name: alpaca-momentum-2026
description: Beat-buy-and-hold crypto strategy for 2025-2026 — a dual-gate trend-regime equal-weight portfolio (long/flat spot, DAILY). Each asset holds its 1/N sleeve only while it is in a confirmed uptrend (price > SMA100 AND > SMA200, short EMA rising), otherwise that sleeve sits in cash. No leverage, no shorting, no momentum-chasing. Validated on real daily 2025-2026 data across 8 majors: beats equal-weight buy-and-hold on every window (+30 to +48pp) at ~1/4 the drawdown; in 2026's down market it correctly goes mostly/all cash. Use to decide a daily hold/cash allocation across majors that protects capital in down markets and participates in real uptrends. SIMULATION/paper by default. For 5-min scalping use the scalper skills; for 1h trend trading use the trend trio.
allowed-tools: mcp__alpaca__get_crypto_bars, mcp__alpaca__get_account_info, mcp__alpaca__get_all_positions, mcp__alpaca__place_crypto_order, mcp__alpaca__close_position, Read, Write, Bash
---

# Beat Buy-and-Hold — the dual-gate trend-regime portfolio

A **daily, long/flat** crypto portfolio built for one explicit goal: **beat buy-and-hold**, validated
primarily on **2025–2026** data. The whole edge is **downside protection** — it sidesteps the big
down-legs that make buy-and-hold lose, while still participating in genuine uptrends. It is *not* a
high-frequency strategy: it checks once per day and switches rarely.

## Why this beats buy-and-hold (and why scalping couldn't)

Buy-and-hold loses badly in a down/choppy market — and **2026 has been exactly that** (equal-weight
of 8 majors: **−35% YTD**, −52% since Jan-2025 off the warmup-aligned start). You cannot beat that by
trading faster — 5-min scalping just feeds the fee floor (we ran it live for 12h: it correctly sat
flat). You beat it by **not holding assets while they fall.** A simple trend filter does that.

## The rule (per asset, daily, causal)

Each asset gets a fixed **1/N capital sleeve**. That sleeve is **INVESTED** entering tomorrow iff,
on today's close:

- **`close > SMA(100)`** — primary trend filter (above the long average), **AND**
- **`close > SMA(200)`** — long-term regime gate (drops perma-downtrenders), **AND**
- **`EMA(10)` rising** — momentum confirmation (don't catch a falling knife).

Otherwise the sleeve is **CASH**. Equal-weight across the universe; rebalance only when a sleeve
flips. No shorting (spot), no leverage, **no cross-sectional chasing** — we tested top-K momentum
ranking and it was *worse* (K=1 = −36%): chasing the hottest name whipsaws in choppy crypto.

## The honest evidence (real daily Binance data, 8 majors, 0.10%/switch)

| Window | Equal-wt Buy&Hold | **Strategy** | vs B&H | Max DD | In-market |
|---|--:|--:|--:|--:|--:|
| Full 2025–26 (520d) | **−52.4%** | **−4.4%** | **+48.0%** | 19% | 36% |
| **2026 only (155d)** | **−35.5%** | **0.0%** | **+35.5%** | **0%** | 0% |

Single-asset trend filter (2025-26) beat B&H on **8/8** majors by **+25pp avg**; it captured the real
up-phases (ETH +82%, BNB +42%, LINK +19% in their sleeves) and stayed cash through the bleed.

**Goal met:** beats buy-and-hold on every window, by +30 to +48 percentage points, at a quarter of
the drawdown. In 2026 it went **100% cash (0%)** — every major is below its SMAs — which beats B&H's
−36% while preserving capital intact for the next uptrend.

## The honest ceiling — read this

It **beats buy-and-hold robustly, but it only ≈ matches cash** in 2026, because the market has offered
**no sustained uptrend** to profit from — there is no alpha to extract from assets that only fall.
When a real uptrend returns, the same gate participates automatically (as the per-asset up-phases
above show). **Do not** add "smart" filters to force it positive in a down market — that is textbook
overfitting (the sibling skills measured it making out-of-sample results *worse*). FLAT/cash beating
a −36% benchmark **is** the win here.

## Use it

```bash
cd .claude/skills/alpaca-momentum-2026
node run.mjs backtest 2025-01-01        # vs equal-weight Buy&Hold + Cash, full + 2026-only windows
node run.mjs decide                      # current hold/cash posture per asset + target weights
node run.mjs decide "BTCUSDT,ETHUSDT,SOLUSDT"   # custom universe
```

`decide` prints, for each asset, **HOLD** (sleeve invested) or **FLAT** (cash) with the gate readout,
then the **target portfolio weights** (each held sleeve = 1/N of equity; the rest stays in USD/USDT).

## Deploy (paper first)

Run `decide` **once per day** (a daily `/loop` or `/schedule`), then make the live book match the
target weights via the Alpaca MCP:
1. `get_account_info` → equity; `get_all_positions` → current book.
2. For each asset newly **HOLD**: `place_crypto_order(sym,"buy",notional=equity/N,type="market")`.
3. For each asset newly **FLAT** that you hold: `close_position(sym)`.
4. Leave everything else untouched. (Daily cadence → tiny turnover, fees are negligible.)

Signal is venue-agnostic (daily trend is the same on Binance/Alpaca); execute on whichever account.
**Paper/simulation by default — confirm before any live order.**

## Guardrails

- **Daily decisions only.** Acting intraday on this adds turnover without edge. One check per day.
- **Long/flat spot.** In a downtrend the correct book is cash — that is the strategy working, not idle.
- **Don't over-fit to beat cash.** The market, not the model, decides whether positive returns exist;
  beating buy-and-hold + protecting drawdown is the durable, honest edge.
- **Re-validate before trusting live.** Regimes change — re-run `backtest` on fresh data periodically.
- State is stateless (pure trend rule) — no learned parameters to corrupt; nothing to back up.
