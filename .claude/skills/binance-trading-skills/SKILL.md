---
name: crypto-specific-skills
description: Decide BUY / SELL / HOLD on a Binance spot pair to maximize fee-adjusted profit, using ONLY the Binance MCP tools. Use when asked whether to buy/sell/hold, to evaluate or time a trade, to detect a trend/pattern, or to "maximize profit" on Binance (BTCUSDT, ETHUSDT, …). Long/flat spot, fee-aware, SIMULATION-ONLY by default. For Alpaca crypto, use the alpaca-crypto-trading skill instead.
allowed-tools: mcp__binance__getPrice, mcp__binance__getOrderBook, mcp__binance__getKlines, mcp__binance__get24hStats, mcp__binance__getAccount, mcp__binance__getExchangeInfo, mcp__binance__getMyTrades, mcp__binance__getOpenOrders, mcp__binance__getOrder, mcp__binance__placeOrder, mcp__binance__cancelOrder, Read, Write, Bash, Glob, Grep
---

# Spot trade decision (regime-first, fee-aware, pattern-driven)

Decide whether to hold an asset (e.g. BTC) or sit in the quote (e.g. USDT) on **spot**.
Long/flat only — no shorting. Tuned and validated by a walk-forward simulation across 6
symbols and bull+bear regimes (see "Evidence"). The live decision logic ships **inside this
skill** as `engine.mjs` (self-contained, no dependencies — exports `classifyRegime` for the
regime call in Step 2 and `runBacktest` for the fee-aware engine in Step 4).

> **MCP scope — Binance only.** This skill talks to the **Binance MCP exclusively**
> (`mcp__binance__*`: `getPrice`, `getKlines`, `get24hStats`, `getOrderBook`, `getAccount`,
> `placeOrder`, …). Do **not** call Alpaca or any other trading MCP from here — pairs (`BTCUSDT`),
> fees (0.10%/fill), and order semantics are Binance-specific and the evidence below was measured
> on Binance data. To trade crypto on **Alpaca**, use the sibling **`alpaca-crypto-trading`** skill.

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

## Current regime — 2026 (refresh before trusting these words)

As of the last calibration (2026-06-03) the market is a **broad bear with one relief rally**:
2026 YTD BTC **−24%**, ETH **−37%**, SOL **−40%**, BNB −24%, XRP −34%, DOGE −21%; the path was
Jan −10%, Feb −15%, **Mar +2% / Apr +12% (relief)**, May −3.5%, Jun −9%. So the default posture
right now is **FLAT (cash)**, with the opportunistic bounce module live only when a symbol is
*choppy with bounces*. **Decide on the 1h timeframe** in this regime — see Step 1. Re-fetch fresh
2026 data (via `getKlines` with `startTime`/`endTime`) and re-validate with a walk-forward
backtest (`runBacktest` in the bundled `engine.mjs`) before relying on any of this; regimes change.

## Step 1 — Gather data (Binance MCP tools)

- `get24hStats(symbol)` → `priceChangePercent`, `highPrice/lowPrice`, `lastPrice`, `weightedAvgPrice`.
- `getKlines(symbol, "1h", 1000)` → **primary decision series in the current (2026) regime.**
  On 2026 data the **1h cadence clearly beats 15m/5m**: 1h made +$1,996 vs cash across 6 majors
  with 0/6 hurt, whereas 15m over-traded and went **−$706 vs cash** (whipsaw + fee-bleed). Use
  finer candles (`5m`/`1m`) only for entry timing / chop, not as the primary decision clock.
  **Capability:** pass `startTime`/`endTime` (epoch ms) to pull any HISTORICAL window (e.g. a past
  bull run, or 2026 YTD) for calibration/backtesting; omit for the latest candles.
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

This is runnable: `classifyRegime(candles, minutesPerCandle, idx?)` in the bundled **`engine.mjs`**
returns `'bull' | 'bear-capit' | 'bear-chop' | 'chop'` causally (only candles ≤ idx).

> **⚠ The "bull" label LAGS — confirm it, never auto-trade it.** On 2026 BTC the classifier
> flagged **both April (+12%, real) AND May (−3.5%, wrong)** as bull, because EMAs/slope trail the
> turn. Acting on the lagging label is dangerous in a choppy bear: it rides relief rallies straight
> into the next down-leg. Tested directly — enabling trend-ride off this label on 2026 data **lost**
> money (ETH +$72→−$16, SOL +$277→+$78). So in a bear-with-bounces, treat a fresh "bull" call as
> *candidate*, require an independent confirmation (sustained breakout + the move actually holding),
> and otherwise stay with the protective default. Riding only pays in a *persistent* bull.

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
(re-validated on 2026 YTD across all 6 majors — `lambda 0.0035` is the peak — plus 9 older datasets):

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
high `lambda` because that's where whipsaw/fee-leak is worst. On 2026 data, dropping `lambda` to
`0.0015` made things **worse** even for majors (+$178 vs +$1,996 at 0.0035, 2/6 hurt vs 0/6) — so
keep `lambda: 0.0035` as the default for all symbols in this regime; only go milder with evidence.

> **`rideTrend` knob (default OFF).** `engine.mjs` has a `rideTrend` option that, once long in the
> trend family, holds until the macro EMA breaks instead of exiting on small pullbacks. It helps in
> a *persistent* bull (BTC 5m bull +6.5%→+11.3%, BTC 1h bull +11%→+18%) but **hurts in 2026's
> choppy bear** (6-major vs-cash +$1,996 → +$1,310, **−$687**) because the bull signal that would
> enable it lags. Leave it off unless you've independently confirmed a sustained uptrend — bull-only.

## Making money in a bear (the honest answer + the bounce module)

**Question:** can you profit in a bear on long/flat spot by trading small variations on
broader timeframes (15m/1h)? **Tested it properly** (a mean-reversion/range variant of the
engine, parallel tuning, then 8 fresh out-of-sample crash windows never used in tuning: May-2021,
FTX, SOL-top, DOGE, BNB-2022). Robust answer:

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

### PRIMARY — 2026 YTD, real Binance data (1h, default `lambda:0.0035`)

| Symbol | Buy & hold | This skill | vs Cash | vs B&H | trades | maxDD |
|--------|-----------:|-----------:|--------:|-------:|-------:|------:|
| BTCUSDT | −24.0% | −0.8% | −$76 | +$2,329 | 4 | 0.8% |
| ETHUSDT | −37.6% | +0.7% | +$72 | +$3,828 | 8 | 1.9% |
| SOLUSDT | −40.2% | +2.8% | +$277 | +$4,300 | 16 | 2.9% |
| BNBUSDT | −25.2% | −0.9% | −$85 | +$2,430 | 2 | 0.9% |
| XRPUSDT | −33.6% | +8.9% | +$886 | +$4,249 | 42 | 7.4% |
| DOGEUSDT | −21.5% | +9.2% | +$922 | +$3,072 | 46 | 9.4% |
| **AGG** | (−20…−40%) | | **+$1,996** | **+$20,209** | 118 | <10% |

→ On *current* data the skill does exactly what it's built for: **beats B&H by ~$20k** (sidesteps a
−20…−40% bleed) and **beats cash by +$1,996 with 0/6 symbols hurt**, max drawdown <10%. Crucially
the cash-beating edge is **broad** here (XRP, DOGE, SOL, ETH all positive) — not a single-symbol
fluke. `lambda` sweep on 2026: 0.0035 is the peak (0.0008→−$1,039/5-hurt; 0.0015→+$178; 0.0035→
+$1,996; 0.006→+$1,345; 0.01→+$1,885 — all of 0.0035–0.01 are safe, 0/6 hurt).

**Older synthetic suite (9 short 1m/5m windows, all net-down):** tuned config **+$370 vs cash**,
**+$6,147 vs B&H**, 1/9 hurt, worst −$86. *Caveat learned this round:* that +$370 was essentially
**one symbol (BNB +$456)** — 8/9 windows just sat in cash. The 2026 set above is the more honest,
multi-symbol evidence; prefer it. (Old un-tuned config: −$39 vs cash, 60 trades.)

**Bull (historical, fetched via `getKlines` startTime):**

| Window | Buy & hold | This skill | All cash | Oracle |
|--------|-----------|------------|----------|--------|
| BTC 5m, +21% bull | +21.4% | **+6.5%** | 0% | +50% |
| ETH 5m, +12% bull | +11.9% | **+8.4%** | 0% | +43% |
| BTC 1h, +32% bull | +32.0% | **+11.1%** | 0% | +119% |

→ The skill **makes real money in uptrends** (far above cash) but **lags buy-and-hold** there —
which is exactly why Step 3 says *hold the trend, don't churn it*. Its structural edge is
downside protection + fee discipline in down/choppy markets.

**Bear bounce module (mean-reversion variant, out-of-sample on 8 unseen crash windows):**

| Config | Train bear vsCash | OOS vsCash | OOS vsBH | Verdict |
|--------|------------------:|-----------:|---------:|---------|
| RSI-reversal + EMA-reclaim (`families:['rsi']`) | +$1,490 (0/8 hurt) | **−$529** (≈cash) | **+$24,633** | robust; the one that generalizes |
| + free-fall gate / stops / TP / edge-margin | up to +$1,883 | −$1,000…−$2,600 | lower | **overfit** — better in-sample, worse OOS |
| all families incl. `trend` | (trend −$19k standalone) | −$4,441 | +$20,721 | trend rides knives down — drop it in bears |

→ In a bear the honest ceiling is **beat B&H massively + ≈ match cash + occasionally catch a
bounce**. Not systematic bear profit. Vertical capitulations still cost a few %; choppy bears
with relief rallies are where the module earns. On 1h slow bears it sits flat (= cash).

## Bundled code & re-validation

The only script the skill needs at decision time is bundled with it:

- **`engine.mjs`** (next to this file, self-contained, no imports):
  - `classifyRegime(candles, minutesPerCandle, idx?)` — the Step 2 regime call
    (`'bull' | 'bear-capit' | 'bear-chop' | 'chop'`), causal.
  - `runBacktest(candles, opts)` — the Step 4 walk-forward fee-aware engine. Key opts:
    `minutesPerCandle`, `stepMin`, `fee`, `lambda` (turnover penalty), `macroMins`, `Lmins`,
    `kGrid`, the bull-only `rideTrend` (default off — see Step 4), and `usePatterns` (trend /
    breakout detectors as a hard entry filter; default off — their real value is the Step 2
    classification).

`candles` is an array of `{ o, h, l, c, v }` — map a `getKlines` response into that shape.

**To re-validate** (regimes change — do this before trusting the numbers above): pull fresh
candles with `getKlines(symbol, "1h", 1000)` (use `startTime`/`endTime` for a historical window),
feed them to `runBacktest`, and compare `vs_cash_usdt` / `vs_bh_usdt` / `max_drawdown` across the
majors. Sweep `lambda` (0.0035 was the 2026 peak). For any bear-bounce variant, always confirm
**out-of-sample** on unseen crash windows — in-sample bear numbers are misleading.
