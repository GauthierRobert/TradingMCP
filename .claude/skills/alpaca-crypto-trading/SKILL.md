---
name: alpaca-crypto-trading
description: Decide BUY / SELL / HOLD on an Alpaca crypto pair (e.g. BTC/USD) to maximize fee-adjusted profit, using ONLY the Alpaca MCP tools. Use when asked whether to buy/sell/hold, to evaluate or time a trade, to detect a trend/pattern, or to "maximize profit" on Alpaca crypto. Long/flat spot, fee-aware, SIMULATION-ONLY by default (paper trading). For Binance, use the crypto-specific-skills skill instead.
allowed-tools: mcp__alpaca__get_crypto_snapshot, mcp__alpaca__get_crypto_bars, mcp__alpaca__get_crypto_latest_bar, mcp__alpaca__get_crypto_latest_quote, mcp__alpaca__get_crypto_quotes, mcp__alpaca__get_crypto_trades, mcp__alpaca__get_crypto_latest_orderbook, mcp__alpaca__get_account_info, mcp__alpaca__get_all_positions, mcp__alpaca__get_open_position, mcp__alpaca__get_orders, mcp__alpaca__get_order_by_id, mcp__alpaca__place_crypto_order, mcp__alpaca__close_position, mcp__alpaca__cancel_order_by_id, mcp__alpaca__cancel_all_orders, Read, Write, Bash, Glob, Grep
---

# Alpaca crypto trade decision (regime-first, fee-aware, pattern-driven)

Decide whether to hold a crypto asset (e.g. BTC) or sit in the quote (USD/USDC) on Alpaca
**spot crypto**. Long/flat only — Alpaca does **not** allow shorting crypto. Crypto trades
**24/7** (no market-hours gate; `get_clock` is for the *stock* market and is irrelevant here).

The decision framework (regime classification + fee-aware walk-forward engine) is **ported from
the Binance `crypto-specific-skills` skill**, which was tuned and validated on Binance data. The
live decision logic ships **inside this skill** as `engine.mjs` (self-contained, no dependencies —
exports `classifyRegime` for Step 2 and `runBacktest` for Step 4). The engine is venue-agnostic:
it takes candles + a `fee`. **But the tuned parameters and all evidence numbers were measured on
Binance at 0.10%/fill — Alpaca's crypto fees are higher (see below), so you MUST re-validate on
Alpaca data before trusting any specific edge.** See "Re-validation (do this first on Alpaca)".

> **MCP scope — Alpaca only.** This skill talks to the **Alpaca MCP exclusively**
> (`mcp__alpaca__*`: `get_crypto_bars`, `get_crypto_snapshot`, `get_crypto_latest_orderbook`,
> `get_account_info`, `get_all_positions`, `place_crypto_order`, `close_position`, …). Do **not**
> call Binance or any other trading MCP from here — pairs (`BTC/USD`), fees, and order semantics
> are Alpaca-specific. To trade on **Binance**, use the sibling **`crypto-specific-skills`** skill.

> **SIMULATION-ONLY by default.** Default to **fictive (paper) reasoning / paper account**. The
> Alpaca MCP server runs with `ALPACA_PAPER_TRADE=true` by default, so orders hit the **paper**
> account — keep it that way. Never place an order against a **live** (real-money) account unless
> the user explicitly asks AND the server was deliberately started with `ALPACA_PAPER_TRADE=false`.
> Confirm before firing any order. Never place a real order to "test".

## The two laws (learned the hard way)

1. **Fees beat prediction — and on Alpaca they bite harder.** Alpaca crypto fees are
   volume-tiered; the **base tier is ≈ 0.15% maker / 0.25% taker** per fill → **~0.50% taker
   round-trip** (vs Binance's 0.20%). *Confirm the current schedule and your tier* — fees come out
   of each fill (inspect a filled order / `get_account_info`). With a fatter round-trip cost, the
   bar for acting is **higher** than on Binance: turnover destroys more edge. **When unsure, HOLD —
   cash (USD) is a position.**
2. **The right action depends on the regime.** There is no single best behaviour:
   - **Strong uptrend → BUY & HOLD.** Active in/out *loses* to holding (fees + missed upside).
   - **Downtrend → STAY FLAT (USD).** Capital preservation IS the win; you can't short crypto here.
   - **Chop / sideways / uncertain → selective fee-aware timing** (the engine below). This is the
     only regime where frequent decisions can add value — and only if edge clears the higher cost.

So **step 1 is always: detect the tendency / regime.** Then pick the matching mode.

## Step 1 — Gather data (Alpaca MCP tools)

Symbols use the **`BASE/QUOTE` uppercase slash format**: `btc/usd` → `BTC/USD`. Common quotes are
`USD`, `USDC`, `USDT`.

- `get_crypto_snapshot(symbol)` → latest bar + latest quote + latest trade in one call (quick read).
- `get_crypto_bars(symbol, timeframe, start?, end?, limit?)` → **primary decision series.** Alpaca
  timeframe strings are `"1Min" | "5Min" | "15Min" | "1Hour" | "1Day"` (NOT Binance's `"1h"`).
  Default to **`"1Hour"`** as the decision clock (mirrors the Binance finding that 1h beats 15m/5m
  by avoiding whipsaw/fee-bleed — re-confirm on Alpaca). Pass `start`/`end` (ISO-8601) to pull a
  HISTORICAL window for calibration/backtesting; omit for the latest candles. Use `5Min`/`1Min`
  only for entry timing, not as the primary clock.
- `get_crypto_latest_orderbook(symbol)` → live bid/ask **spread** (true cost = fee + spread) and
  book imbalance (more size on bids near top = buy pressure). Live-only, not backtestable.
- `get_account_info()` → buying power, cash, portfolio value (what you can actually deploy).
- `get_all_positions()` / `get_open_position(symbol)` → current crypto holdings & unrealized P&L.

## Step 2 — Detect the tendency (pattern / regime classification)

Compute these at the decision time (causal — only past candles):

- **Trend structure** — sign of the linear-regression slope of close over ~120 min, normalized by
  price. `> +0.02%/bar` = **uptrend**, `< −0.02%/bar` = **downtrend**, else **range**. Cross-check
  with the macro EMA stack (price vs EMA-120/240/480 and whether they're rising).
- **Breakout** — close above the highest high of the last ~60 min = bullish breakout; below the
  lowest low = bearish breakdown; inside = range.
- **Volatility regime** — stdev of short-horizon returns now vs its longer baseline. Expansion +
  breakout = real move; contraction = no edge, prefer FLAT.
- **24h context** — where price sits within its 24h high/low band, and the sign of the 24h change
  (derive from the bars / `get_crypto_snapshot`).

Classify: **UPTREND** (slope up + above rising EMAs, ideally a fresh breakout) / **DOWNTREND**
(slope down + below falling EMAs) / **CHOP** (range, no breakout, mixed EMAs).

This is runnable: `classifyRegime(candles, minutesPerCandle, idx?)` in the bundled **`engine.mjs`**
returns `'bull' | 'bear-capit' | 'bear-chop' | 'chop'` causally (only candles ≤ idx). Map each
`get_crypto_bars` bar into `{ o, h, l, c, v }` first (see "Bundled code"). For `"1Hour"` bars,
`minutesPerCandle = 60`.

> **⚠ The "bull" label LAGS — confirm it, never auto-trade it.** EMA/slope-based labels trail the
> turn, so in a choppy market a fresh "bull" call can be a relief rally about to roll over. Treat a
> fresh "bull" as a *candidate*: require an independent confirmation (sustained breakout + the move
> actually holding) before riding it; otherwise stay with the protective default. Riding only pays
> in a *persistent* uptrend.

## Step 3 — Pick the mode

| Regime (Step 2) | Mode | Action rule |
|---|---|---|
| **UPTREND** (confirmed) | **Hold the trend** | If in USD and a clean breakout/uptrend confirms, **BUY** then **HOLD** — do NOT churn. Exit only on a clear trend break (price loses EMA + momentum rolls over). |
| **DOWNTREND — vertical / capitulation** (price falling fast, slow EMA steeply down) | **Protect** | If holding the asset, **SELL to USD** immediately (`close_position` flattens). Stay **FLAT**. Don't "buy the dip" against a falling EMA. FLAT (=USD) IS the win. |
| **DOWNTREND — choppy / relief-rally bear** (down overall, but with bounces) | **Optional bounce module** | A small, fee-disciplined **RSI-reversal buy** can capture relief rallies — see "Making money in a bear". Opportunistic, not core; with Alpaca's higher fees it needs an even bigger bounce to clear cost. |
| **CHOP / uncertain** | **Selective timing** | Run the fee-aware engine (Step 4). Trade only high-conviction, edge>cost signals; otherwise HOLD. |

The macro gate (never hold unless price > rising slow EMA) makes this automatic: it forces FLAT in
downtrends and only permits longs when the trend is up.

## Step 4 — The fee-aware engine (for CHOP / general use)

Walk-forward selector over {trend-follow, mean-reversion, flat}, re-optimized each ~10 min on all
data seen so far, **net of fees**, with a **turnover penalty** so it won't churn. Run it via
`runBacktest(candles, opts)` in the bundled `engine.mjs`. Starting params (ported from Binance —
**re-tune on Alpaca**, see below). Critically, **set `fee` to Alpaca's real per-fill taker rate**:

```
stepMin: 10        fee: 0.0025   # ← Alpaca base-tier taker (0.25%/fill); NOT Binance's 0.001
lambda: 0.0035     # turnover penalty — likely needs to go HIGHER on Alpaca (fees are bigger)
macroMins: [120, 240, 480]       # slow macro gate — filters false uptrends on noise
Lmins: [10,20,30,45,60]          kGrid: [0.001,0.002,0.004,0.006]
```

- **trend**: long if `mom(L) > k·band`; exit only if `mom < −k·band` (hysteresis — don't flip on noise).
- **mean-rev**: buy oversold dips *inside* an uptrend; exit when momentum turns back up.
- Each block, only act if the in-sample net-of-fee edge clears the turnover penalty; else FLAT.

**Minimum-edge test, every trade (Alpaca-adjusted):** `expected_move > 2·taker_fee + spread + buffer`
≈ **0.50% + spread + buffer** (vs ~0.20% on Binance). If a switch doesn't clearly clear that bar,
**HOLD**. Because the cost floor is ~2.5× Binance's, expect the optimal `lambda` to be higher and
the optimal trade count lower — when in doubt, trade less.

> **`rideTrend` knob (default OFF).** `engine.mjs` has a `rideTrend` option that, once long in the
> trend family, holds until the macro EMA breaks instead of exiting on small pullbacks. It helps in
> a *persistent* bull but hurts in a choppy bear (the bull signal that enables it lags). Leave it
> off unless you've independently confirmed a sustained uptrend — bull-only.

## Step 4b — FARS: fee-aware take-profit scalper (the "must-act" mode, GATED)

The "decide every bar — BUY, or SELL once the gain clears 2× the fee" idea, made
fee-disciplined and **regime-gated**. Lives in `engine.mjs` as `farsSignal(...)` (live decision)
and `FARS_CFG` (the locked params); backtested in `_session/lab.mjs`. Long/flat, causal.

**The rule (validated FIXED config — do NOT per-window fit; fitting overfits, proven below):**
`{ refSpan:24, dipPct:0.01, rsiBuy:35, tp:0.03, stop:0.02, maxBars:48, macroGate:true, macroSpan:240 }`
- **Macro gate (the part that makes it work):** only BUY when the slow EMA(240) is *rising* over
  the last 24 bars **and** price is above it. In a downtrend the gate stays **shut → FLAT**. This
  is what stops the knife-catching that sinks naive "always act" strategies.
- **Entry** (flat→long): gate open **and** price dips ≥1% below the ref EMA(24) **and** RSI(14)<35.
- **Exit** (long→flat): take-profit at **+3%** (≥ 2× the ~0.50% round-trip, i.e. the user's "margin
  above 2× fee" law), or stop at −2%, or a 48-bar timeout to free idle capital.

**Evidence (Alpaca 1Hour, fee 0.25%/fill, measured 2026-06-03):**
| Pair | net vs cash 120d | net vs cash 180d | held-out downtrend tail |
|---|---|---|---|
| **ETH/USD** | **+$865 (+8.7%)** | **+$692 (+6.9%)** | gate goes flat (0 trades) — no bleed |
| **BTC/USD** | **+$723 (+7.2%)** | **+$652 (+6.5%)** | flat / +$33 — no bleed |
| SOL/USD | −$1,026 | −$346 | loses — **EXCLUDE** (wide spread + persistent downtrend) |

**What the tests proved (and what NOT to do):**
- *Unconditional* must-act **loses to cash** on 2/3 pairs (SOL −$2.2k) — fee-bleed + knife-catching.
  The naive ETH "win" was +$281 net while paying **$1,428 in fees** (fees 5× the profit).
- *Per-window parameter fitting* **overfits**: train +23.9% → held-out −10.5% on ETH. Hence the
  **single fixed config** above, applied blindly — its held-out behaviour is flat-not-bleeding.
- The durable edge is the same one the engine already had: **only act when the trend is genuinely
  up; otherwise cash.** FARS just harvests the up-legs more actively (take-profit at 2× fee) when
  the gate is open. It beats buy-and-hold by a mile in every window (downside protection holds).

**Run it live:** `node _session/harness.mjs fars "ETH/USD" 30 1Hour 60 [long entryPx heldBars]`
→ returns `{action: BUY|SELL|HOLD, reason, macroUp, rsi, dipFromRef, ...}`. Pass the trailing
`long <entryPx> <heldBars>` args when you already hold the asset so it can evaluate TP/stop/timeout.
**Re-sweep** when you want to re-confirm: `node _session/lab.mjs fixed "ETH/USD,BTC/USD" 120` (fixed
rule, no fitting) or `node _session/lab.mjs oos "ETH/USD" 120` (train/test split — expect OOS to be
modest; trust `fixed` over `sweep`). SOL stays excluded until its spread tightens.

## Making money in a bear (the honest answer + the bounce module)

On Binance data, the robust findings were: **you can't reliably beat CASH** in a bear on long/flat
spot, but you **can reliably beat buy-and-hold by a mile** (avoid the drawdown) and
**opportunistically catch relief rallies** with an **RSI reversal-buy gated by an EMA-reclaim**.
With Alpaca's higher fees this is *strictly harder* — the same bounce must overcome ~0.50%
round-trip instead of ~0.20%, so marginal bounces that paid on Binance won't here.

**The bounce module (use only in a *choppy* bear, sized small):**
- Entry: **RSI(short) crosses up through ~30 AND price reclaims a short EMA(~1h)** — buy the *turn*,
  not the falling knife.
- Exit: RSI back above ~55, or price reverts to the mean. Keep the ~0.50% round-trip in mind.
- **Don't add "smart" filters.** Free-fall gates, tighter stops, take-profits, and edge-margins all
  improved the backtest but made out-of-sample *worse* (textbook overfitting). The trend-follow
  family is catastrophic in a bear (rides knives down); in a downtrend only the RSI-reversal family
  earns its keep — and even it only ≈ matches cash on Binance, likely worse on Alpaca fees.

**Bottom line for a bear:** default to **FLAT (USD)**. Run the bounce module only when the bear is
*choppy with bounces*, size it small, and never expect it to systematically out-earn cash.

## Step 5 — Act (paper by default)

State **side, price, size, the fee (≈0.25%/fill), and the spread**, and track running paper P&L
(gross, fees, net).

- **Place an order** only on explicit user request (and, for real money, only if the server is in
  live mode). Use `place_crypto_order(symbol, side, ...)`:
  - **BUY**: size with **`notional`** (USD amount to spend).
  - **SELL**: size with **`qty`** (units), or use `close_position(symbol)` to flatten the whole position.
  - `type: "market"` by default; `time_in_force: "gtc"` (crypto supports `gtc`/`ioc`, not `day`).
  - Confirm before firing. Re-read with `get_order_by_id` / `get_orders` to verify the fill and the
    actual fee paid.

## Step 6 — Report

Output: **DECISION** (BUY/SELL/HOLD) · detected **regime** + the tendencies that imply it · **signal
vs band** · **edge-vs-(fee+spread)** check using the **Alpaca ~0.50% round-trip** · resulting
position · updated paper P&L. Always benchmark against **buy-and-hold** and **all-cash (0%)**, and
name the realistic **ceiling** (oracle). In a downtrend, ~0% IS the win. **If you have not yet
re-validated on Alpaca data, say so** and treat the decision as provisional.

## Guardrails

- Long/flat spot only — no shorting crypto on Alpaca; in a downtrend the best play is FLAT (USD).
- **Overtrading is the #1 way to lose — more so here** because Alpaca's round-trip cost is ~2.5×
  Binance's. Honour the turnover penalty and the (higher) minimum-edge test.
- In a strong, persistent uptrend, **don't out-clever buy-and-hold** — just hold.
- Never invent an uptrend; if the macro gate isn't bull, the answer is HOLD USD.
- Paper by default. Real-money orders need explicit user intent AND a server started in live mode.
- **Don't quote the Binance evidence as if it were Alpaca-proven.** Re-validate first.

## Bundled code & re-validation (do this first on Alpaca)

The only script the skill needs at decision time is bundled with it:

- **`engine.mjs`** (next to this file, self-contained, no imports):
  - `classifyRegime(candles, minutesPerCandle, idx?)` — the Step 2 regime call, causal.
  - `runBacktest(candles, opts)` — the Step 4 walk-forward fee-aware engine. **Always pass
    `fee: 0.0025`** (Alpaca base-tier taker) — the default `0.001` is Binance's and will understate
    cost. Key opts: `minutesPerCandle`, `stepMin`, `fee`, `lambda`, `macroMins`, `Lmins`, `kGrid`,
    bull-only `rideTrend` (default off), `usePatterns` (default off).

`candles` is an array of `{ o, h, l, c, v }`. Map a `get_crypto_bars` response into that shape
(rename `open/high/low/close/volume` → `o/h/l/c/v`; for `"1Hour"` bars `minutesPerCandle = 60`).

**Re-validation procedure (required before trusting numbers — the ported params are Binance-tuned):**
1. Pull a long historical window per symbol: `get_crypto_bars("BTC/USD", "1Hour", start, end)` for
   the majors you care about (BTC, ETH, SOL, … /USD). Cover both a bull and a bear stretch.
2. Map to `{o,h,l,c,v}` and run `runBacktest(candles, { minutesPerCandle: 60, fee: 0.0025, lambda })`.
3. **Sweep `lambda`** (start around 0.0035 and go *up* — higher fees usually want more turnover
   penalty) and compare `vs_cash_usdt`, `vs_bh_usdt`, `max_drawdown`, `trades` across symbols. Pick
   the `lambda` that beats cash on the most symbols with 0 badly hurt.
4. For any bear-bounce variant, confirm **out-of-sample** on unseen crash windows — in-sample bear
   numbers are misleading.
5. Record the chosen params here once validated, and only then rely on a live decision.

### Provenance — Binance evidence (NOT yet reproduced on Alpaca)

For reference only, the ported framework's Binance walk-forward results (0.10% fee, $10k start,
1h, `lambda 0.0035`, 2026 YTD) were: **+$1,996 vs cash** and **~+$20k vs buy-and-hold** across 6
majors with 0/6 hurt and <10% max drawdown — i.e. its durable edge is **downside protection + fee
discipline**, not systematic alpha. These numbers **do not carry over to Alpaca** (different fees,
liquidity, venues, and the USD/USDC quote). Reproduce them with the procedure above before citing
any expected edge to the user.
