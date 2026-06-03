---
name: spot-trade-decision
description: Decide BUY / SELL / HOLD on a Binance spot pair to maximize fee-adjusted profit. Use when asked whether to buy/sell/hold, to evaluate or time a trade, to detect a trend/pattern, or to "maximize profit" with the Binance MCP tools. Long/flat spot, fee-aware, SIMULATION-ONLY by default.
---

# Spot trade decision (regime-first, fee-aware, pattern-driven)

Decide whether to hold an asset (e.g. BTC) or sit in the quote (e.g. USDT) on **spot**.
Long/flat only — no shorting. Tuned and validated by a walk-forward simulation across 6
symbols and bull+bear regimes (see `sim/` and "Evidence").

> **SIMULATION-ONLY.** Default to **fictive (paper) orders**. Never place a live order unless
> the user explicitly asks AND `binance.trading-enabled=true`. The server ships with
> `BINANCE_TRADING_ENABLED=false` so live trading is blocked by default — keep it that way
> unless told otherwise.

## The two laws (learned the hard way)

1. **Fees beat prediction.** Taker fee 0.10%/fill → 0.20% round-trip (confirm via `getAccount`
   → `commissionRates.taker`). At a 10-min cadence, even *perfect* foresight can go
   net-negative from turnover. **When unsure, HOLD — cash is a position.**
2. **The right action depends on the regime.** There is no single best behaviour:
   - **Strong uptrend → BUY & HOLD.** Active in/out *loses* to holding (fees + missed upside).
     Evidence: BTC bull B&H **+21%** vs active **+10%**.
   - **Downtrend → STAY FLAT (quote).** Capital preservation IS the win; you can't short spot.
     Evidence: BTC bear B&H **−5%** vs active **~0%**.
   - **Chop / sideways / uncertain → selective fee-aware timing** (the engine below). This is
     the only regime where frequent decisions add value.

So **step 1 is always: detect the tendency / regime.** Then pick the matching mode.

## Step 1 — Gather data (Binance MCP tools)

- `get24hStats(symbol)` → `priceChangePercent`, `highPrice/lowPrice`, `lastPrice`, `weightedAvgPrice`.
- `getKlines(symbol, "5m", 1000)` and `getKlines(symbol, "1m", 1000)` → price series.
  **New capability:** pass `startTime`/`endTime` (epoch ms) to pull any HISTORICAL window
  (e.g. a past bull run) for calibration/backtesting; omit for the latest candles.
- `getOrderBook(symbol, 20)` → live bid/ask **spread** (true cost = fee + spread) and book
  imbalance (more bids than asks near top = buy pressure). Live-only context, not backtestable.
- `getAccount()` → real taker fee + current balances (what you actually hold).

Upper-case the symbol (`btcusdt` → `BTCUSDT`).

## Step 2 — Detect the tendency (pattern / regime classification)

Compute these at the decision time (causal — only past candles):

- **Trend structure** — sign of the linear-regression slope of close over ~120 min, normalized
  by price. `> +0.02%/bar` = **uptrend**, `< −0.02%/bar` = **downtrend**, else **range**.
  Cross-check with the macro EMA stack (price vs EMA-120/240/480 and whether they're rising).
- **Breakout** — close above the highest high of the last ~60 min = bullish breakout;
  below the lowest low = bearish breakdown; inside = range.
- **Volatility regime** — stdev of 1-min returns now vs its longer baseline. Expansion +
  breakout = real move; contraction = no edge, prefer FLAT.
- **24h context** — where is price within the 24h high/low band, and the sign of `priceChangePercent`.

Classify: **UPTREND** (slope up + above rising EMAs, ideally a fresh breakout) /
**DOWNTREND** (slope down + below falling EMAs) / **CHOP** (range, no breakout, mixed EMAs).

## Step 3 — Pick the mode

| Regime (Step 2) | Mode | Action rule |
|---|---|---|
| **UPTREND** (confirmed) | **Hold the trend** | If in quote and a clean breakout/uptrend confirms, **BUY** and then **HOLD** — do NOT churn. Exit only on a clear trend break (price loses EMA + momentum rolls over). |
| **DOWNTREND — vertical / capitulation** (price falling fast, slow EMA steeply down) | **Protect** | If holding the asset, **SELL to quote** immediately. Stay **FLAT**. Do not "buy the dip" against a falling EMA — capitulations are where dip-buying loses the most. FLAT (=cash) IS the win. |
| **DOWNTREND — choppy / relief-rally bear** (down overall, but with bounces) | **Optional bounce module** | A small, fee-disciplined **RSI-reversal buy** can capture relief rallies — see "Making money in a bear" below. It reliably beats buy-and-hold and ≈ matches cash; it does **not** reliably beat cash, so treat it as opportunistic, not core. |
| **CHOP / uncertain** | **Selective timing** | Run the fee-aware engine (Step 4). Trade only high-conviction, edge>cost signals; otherwise HOLD. |

The macro gate (never hold unless price > rising slow EMA) makes this automatic: it forces
FLAT in downtrends and only permits longs when the trend is up.

## Step 4 — The fee-aware engine (for CHOP / general use)

Walk-forward selector over {trend-follow, mean-reversion, flat}, re-optimized each ~10 min on
all data seen so far, net of fees, with a **turnover penalty** so it won't churn. Tuned params
(validated robust across 9 datasets):

```
stepMin: 10        fee: 0.001 (0.10%/fill)
lambda: 0.0035     # turnover penalty — THE knob that stops fee-bleed in chop
macroMins: [120, 240, 480]   # slow macro gate — filters false uptrends on noise
Lmins: [10,20,30,45,60]      kGrid: [0.001,0.002,0.004,0.006]
```

- **trend**: long if `mom(L) > k·band`; exit only if `mom < −k·band` (hysteresis — don't flip on noise).
- **mean-rev**: buy oversold dips *inside* an uptrend; exit when momentum turns back up.
- Each block, only act if the in-sample net-of-fee edge clears the turnover penalty; else FLAT.

**Minimum-edge test, every trade:** `expected_move > 2·fee + spread + buffer` (≈ 0.20% + spread + 0.10%).
If a switch doesn't clearly clear that bar, **HOLD**.

For higher-volatility alts (SOL/XRP/DOGE) the same params work; they benefit most from the
high `lambda` because that's where whipsaw/fee-leak is worst. Majors can run milder (`lambda:0.0015`).

## Making money in a bear (the honest answer + the bounce module)

**Question:** can you profit in a bear on long/flat spot by trading small variations on
broader timeframes (15m/1h)? **Tested it properly** (`sim/engine2.mjs`, parallel tuning,
then 8 fresh out-of-sample crash windows never used in tuning: May-2021, FTX, SOL-top,
DOGE, BNB-2022). Robust answer:

- **You can't reliably beat CASH.** Every dip-buying configuration that looked profitable
  in-sample (+$1,490) was ≈ breakeven out-of-sample (**−$529 vsCash**). Beating B&H is
  trivial and not the bar — beating *cash (0%)* is, and nothing did it robustly.
- **You CAN reliably beat buy-and-hold by a mile** (OOS **+$24,633 vsBH** across 8 crashes)
  and **avoid the bear's damage**. That downside protection is the real, durable edge.
- **You can opportunistically catch relief rallies.** The one config that generalized —
  **RSI reversal-buy gated by an EMA-reclaim** (`entryConfirm:'emaReclaim', families:['rsi']`)
  — made real money on crash→bounce windows (FTX ETH **+13%**, DOGE +4.8%, BTC +3.6%) but
  lost on near-vertical capitulations (May-2021 BTC −10%, ETH −12%). Net ≈ cash.

**The bounce module (use only in a *choppy* bear, sized small):**
- Entry: **RSI(period ~2–4h) crosses up through ~30 AND price reclaims a short EMA(~1h)** —
  i.e. buy the *turn*, not the falling knife. On 1h slow grinds it correctly stays flat.
- Exit: RSI back above ~55, or price reverts to the mean. Keep the 0.20% round-trip in mind.
- **Hard lesson — don't add "smart" filters.** Free-fall gates, tighter stop-losses,
  take-profits, and selector edge-margins all improved the backtest but made out-of-sample
  *worse* (textbook overfitting). The trend-follow family is **catastrophic** in a bear
  (−$19k standalone — it rides knives down); in a downtrend only the RSI-reversal family
  earns its keep, and even it only ≈ matches cash.

**Bottom line for a bear:** default to **FLAT (cash)** — it's the benchmark you usually
can't beat. Run the bounce module only when the bear is *choppy with bounces*, treat it as
opportunistic downside-protection-plus, and never expect it to systematically out-earn cash.

## Step 5 — Act (fictive by default)

State **side, price, size, the 0.10% fee**, and track running paper P&L (gross, fees, net).
- **Live order** only on explicit user request + `trading-enabled=true`: `placeOrder(...)`
  (enforces `requireTradingEnabled()`); size BUYs with `quoteOrderQty`, SELLs with `quantity`.
  Confirm before firing. Never place a live order to "test".

## Step 6 — Report

Output: **DECISION** (BUY/SELL/HOLD) · detected **regime** + the tendencies that imply it ·
**signal vs band** · **edge-vs-(fee+spread)** check · resulting position · updated paper P&L.
Always benchmark against **buy-and-hold** and **all-cash (0%)**, and name the realistic
**ceiling** (oracle). Don't chase profit the data doesn't contain — in a downtrend, ~0% IS the win.

## Guardrails

- Long/flat spot only — no shorting; in a downtrend the best play is FLAT (quote).
- **Overtrading is the #1 way to lose.** Honour the turnover penalty and minimum-edge test.
- In a strong, persistent uptrend, **don't out-clever buy-and-hold** — just hold.
- Never invent an uptrend; if the macro gate isn't bull, the answer is HOLD cash.
- Simulation-only by default. Live orders need explicit intent + `trading-enabled=true`.

## Evidence (walk-forward, no lookahead, 0.10% fee, $10k start)

**Bear / chop (today, 9 datasets, all net-down):** tuned config aggregate **+$370 vs cash**
and **+$6,147 vs buy-and-hold**, only 1/9 windows down >$10, worst −$86. (Old un-tuned config:
−$39 vs cash, 60 trades. Tuning cut trades to 26 and removed the fee-bleed.)

**Bull (historical, fetched via `getKlines` startTime):**

| Window | Buy & hold | This skill | All cash | Oracle |
|--------|-----------|------------|----------|--------|
| BTC 5m, +21% bull | +21.4% | **+6.5%** | 0% | +50% |
| ETH 5m, +12% bull | +11.9% | **+8.4%** | 0% | +43% |
| BTC 1h, +32% bull | +32.0% | **+11.1%** | 0% | +119% |

→ The skill **makes real money in uptrends** (far above cash) but **lags buy-and-hold** there —
which is exactly why Step 3 says *hold the trend, don't churn it*. Its structural edge is
downside protection + fee discipline in down/choppy markets.

**Bear bounce module (engine2, out-of-sample on 8 unseen crash windows):**

| Config | Train bear vsCash | OOS vsCash | OOS vsBH | Verdict |
|--------|------------------:|-----------:|---------:|---------|
| RSI-reversal + EMA-reclaim (`families:['rsi']`) | +$1,490 (0/8 hurt) | **−$529** (≈cash) | **+$24,633** | robust; the one that generalizes |
| + free-fall gate / stops / TP / edge-margin | up to +$1,883 | −$1,000…−$2,600 | lower | **overfit** — better in-sample, worse OOS |
| all families incl. `trend` | (trend −$19k standalone) | −$4,441 | +$20,721 | trend rides knives down — drop it in bears |

→ In a bear the honest ceiling is **beat B&H massively + ≈ match cash + occasionally catch a
bounce**. Not systematic bear profit. Vertical capitulations still cost a few %; choppy bears
with relief rallies are where the module earns. On 1h slow bears it sits flat (= cash).

## Supporting tooling (evidence, not the skill)

- `sim/engine.mjs` — walk-forward backtester `runBacktest(candles, opts)` incl. the pattern
  detectors (trend structure, breakout) behind `usePatterns` (off by default — as a hard entry
  filter it tested mixed; the detectors' real value is regime classification in Step 2).
- `sim/run.mjs` — `node sim/run.mjs <DATASET> <minutesPerCandle> [startFrac endFrac] [optsJSON]`.
- `sim/validate_all.mjs` — multi-dataset comparison. Re-tune `lambda`/`macroMins`/`kGrid` on
  fresh `getKlines` data (including historical windows) before trusting a decision.
- **Bear-module tooling (engine2):** `sim/engine2.mjs` — mean-reversion/range families
  (`mr_z`, `rsi`, `bb`, `donch`) + risk controls + `entryConfirm`/free-fall/edge-margin toggles.
  `sim/fetch.mjs` — paginating historical klines fetcher (any symbol/interval/date range).
  `sim/datasets.mjs` — labelled dataset manifest. `sim/validate2.mjs` — parallel multi-dataset
  run. `sim/oos.mjs` / `sim/compare.mjs` — out-of-sample vs training comparison (the
  overfitting check). **Always confirm a bear config OOS on unseen crash windows before
  trusting it — in-sample bear numbers are misleading.**
