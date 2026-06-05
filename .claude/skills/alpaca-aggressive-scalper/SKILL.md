---
name: alpaca-aggressive-scalper
description: VERY AGGRESSIVE 1-minute long/flat crypto scalper for Alpaca that takes every qualifying momentum setup fast — but is kept survivable by three research-backed levers: MAKER-FIRST execution (post-only limit orders pay Alpaca's 0.15% maker fee, not 0.25% taker, ~halving the round-trip cost), an ATR volatility gate (only fire when the expected move clears the fee floor), and live order-book imbalance confirmation. ATR-adaptive take-profit/stop/trail, momentum-burst + micro-breakout entries, near-zero cooldown. A counterfactual bandit scores a grid of aggressive arms (plus a FLAT safety arm) on real bars + paper fills and self-tunes. Fee-aware. Targets the Alpaca PAPER account; independent of the other Alpaca skills.
allowed-tools: mcp__alpaca__get_crypto_snapshot, mcp__alpaca__get_crypto_bars, mcp__alpaca__get_crypto_latest_bar, mcp__alpaca__get_crypto_latest_quote, mcp__alpaca__get_crypto_latest_orderbook, mcp__alpaca__get_account_info, mcp__alpaca__get_all_positions, mcp__alpaca__get_open_position, mcp__alpaca__get_orders, mcp__alpaca__place_crypto_order, mcp__alpaca__close_position, mcp__alpaca__cancel_order_by_id, mcp__alpaca__cancel_all_orders, Read, Write, Bash
---

# Aggressive scalper — fast 1-minute momentum, made survivable by maker-first fees

A **very aggressive** short-term engine. On every 1-minute bar it takes **every qualifying
momentum setup** — momentum bursts, micro-breakouts, and pullback-continuations — with a
near-zero cooldown so it never waits out a window. That is the aggression. What keeps aggression
from being suicidal is **fee discipline built from deep research**, not timidity.

This is the **sixth, independent** Alpaca skill — it shares no code with the trio or the
medium-aggressive `alpaca-adaptive-scalper`. Its differences are deliberate: a **lower fee floor**
(maker-first execution), an **ATR volatility gate** instead of a fixed take-profit, and a **live
order-book imbalance** confirmation those skills don't have.

> **Mode: PAPER account, auto-trading via Claude `/loop`.** Runs on the **Alpaca paper account**
> (real paper fills feed the learner). `tick` returns a ready-to-execute plan; Claude places the
> **paper** orders via the Alpaca MCP each 1-min tick. **No live-money trading** until you
> deliberately point it at a live server and confirm.

## The deep research — why "aggressive" usually loses, and the three levers that change the math

Naive 1-minute scalping **cannot beat the fee floor** — the `alpaca-adaptive-scalper` measured this
across a +52% bull and recent chop, and this skill reproduced it (table below). Turnover is the
enemy: each round trip must clear cost, and at base-tier all-taker that cost is **~0.56%**
(0.25%×2 + ~0.06% spread). Most 1-min edges are smaller than that. So aggression only works if you
**lower the cost floor** and **only act when the move is big enough**. Three research-backed levers:

**1. MAKER-FIRST execution — the single biggest lever.** Alpaca crypto fees are tiered
(base **0.15% maker / 0.25% taker**, improving with 30-day volume). A *post-only limit order* is
the only way to guarantee the **maker** fee on a leg. If you enter on a resting limit **and** exit
your take-profit on a resting limit, you pay maker on **both** legs:
**~0.36% round-trip (0.15%×2 + spread) vs ~0.56% all-taker** — nearly half. Only the *stop* exit
crosses the book and pays taker. The engine models this honestly: a take-profit charges the maker
round-trip, a stop/trail/time-exit charges the taker round-trip. *Bonus:* an aggressive bot
**generates volume**, which tiers its own fees down (0.15→0.12→0.10% maker).

**2. ATR VOLATILITY GATE — only fire when the move can pay.** Using ATR(7), the engine requires
`ATR% ≥ minAtrPct` before any entry, and the most disciplined arm also requires **volatility
expansion** (`ATR(7) ≥ 1.5×ATR(20)`). Research on ATR scalping is blunt: trade only when expected
move clears costs; a volatility spike (ATR > 1.5× its baseline) is what separates a real move from
noise. Take-profit/stop/trail are then **ATR-adaptive** — wide in fast tape, tight in calm tape —
but the take-profit is **clamped to never drop below the maker fee floor**.

**3. ORDER-BOOK IMBALANCE — a live microstructure edge.** Aggressive one-sided pressure tends to
persist 10–30s, so top-of-book imbalance (bid share of bid+ask size) is a short-horizon directional
signal. Live entries require `obi ≥ obiBuy` (default 0.55) as confirmation. It's **live-only**
(not in the backtest), fetched from Alpaca's public quote feed.

Sources: [Alpaca crypto fees](https://docs.alpaca.markets/us/docs/crypto-fees) ·
[Alpaca maker/taker FAQ](https://alpaca.markets/support/crypto-maker-taker-gmt-faq) ·
[post-only / maker execution](https://cow.fi/learn/what-you-need-to-know-about-crypto-post-only-orders-in-2026) ·
[ATR scalping](https://www.quantifiedstrategies.com/average-true-range-trading-strategy/) ·
[order-book microstructure](https://www.coinapi.io/blog/is-crypto-scalping-still-profitable-2025-coinapi-data-driven-insights).

## Read this first — the honest evidence (measured 2026-06-03, real Alpaca 5Min bars)

> **The live clock is now 1Min** (changed from 5Min). The table below was measured on **5Min** bars —
> the *kinder* baseline. The 1-minute clock turns over ~5× faster, so the bleed below is a **lower
> bound**: expect it worse at 1 minute. Re-run `learn` to re-measure on real 1Min bars.

`node run.mjs learn "BTC/USD" 14` over **4,032 real 5Min bars**, fees modelled maker-first:

| Arm | trades | win% | net sumPnl | verdict |
|---|---|---|---|---|
| A3 ultra-fast | 150 | 4% | **−71%** | over-trades; even maker fees bury it |
| A1 aggressive momentum | 108 | 8% | **−49%** | bleeds |
| A2 burst-runner | 105 | 10% | **−48%** | bleeds |
| **A4 expansion-gated** | **0** | — | **0%** | gate stayed shut → no trades, no bleed |
| **A0 FLAT (safety)** | — | — | **0%** | **bandit promoted this — the honest winner** |

**What this proves — even maker-first, aggressive 5-min scalping bleeds in chop.** Halving the fee
floor helps, but it does **not** manufacture an edge that isn't there: the bandit correctly
**demoted A1 → A0 (FLAT)** on the first learn pass. The *disciplined* arm (A4 — requires volatility
expansion + macro-up) refused to trade at all, which is exactly right. **Treat any positive edge as
unproven until the paper account shows it.** The skill's value is the *harness*: it deploys an
aggressive arm **only** when one genuinely earns it on recent real bars, and otherwise preserves
capital — automatically. It ships seeded on A1 and **trades aggressively from the very first tick**
(cold start trusts the seed); the first hourly `learn` then **demotes it to FLAT** if the aggression
isn't clearing the maker fee floor on recent bars — which is what happened above. That's correct,
not a bug. To keep it aggressive longer, widen the universe or run it in trendier tape, not by
loosening the fee gate.

## How a decision is made (fast, causal, ATR + maker-first)

Compute on the last bar (arrays precomputed once):

- **Volatility gate** — `ATR(7)/price ≥ minAtrPct`; disciplined arms also need `ATR(7) ≥ volExpand×ATR(20)`.
- **Trend posture** — EMA(9/21/50). Aggressive arms run `macroGate:false` (pure momentum); the
  selective arm requires EMA(50) rising.
- **Entry (flat→long)** — any trigger fires: **breakout** (close > Donchian-high(`breakoutN`),
  EMA9>EMA21, volume ok), **momentum burst** (this bar's return ≥ `burstK × ATR%`), or
  **pullback-continuation** (uptrend stack, price back near EMA21, RSI turning up). RSI must be
  below `rsiMaxBuy`; **live** also requires order-book imbalance ≥ `obiBuy`.
- **Exit (long→flat)** — ATR-adaptive: take-profit `tpAtrMult×ATR%` (clamped ≥ fee floor), stop
  `stopAtrMult×ATR%`, armed trail `trailAtrMult×ATR%`, fast trend-break below **EMA21**, time-stop
  at `maxHold`. A short `cooldown` (0–2 bars) blocks instant re-entry.
- **Fee floor** — the take-profit can never be below `2·makerFee + spread + buffer` (~0.42%). No
  trade targets a move that mathematically can't clear maker cost.

## The self-learning loop (real + fictive feedback)

Each `learn` pass: (1) every arm is **counterfactually simulated** on the recent 1Min window, each
shadow trade's **net-of-fee P&L** (maker cost for TP exits, taker cost for stop exits) is the
reward; (2) actual paper fills logged via `closed` are folded into the arm that produced them,
weighted **×`realWeight`** (3); (3) a **discounted EW-mean bandit** ranks arms — live `decide`
exploits the leader; the FLAT arm wins ties at 0 whenever all traders are negative. Then it
**evolves the grid**: spawns bounded neighbours of the best trading arm (±steps on
tp/stop/trail/maxHold/breakoutN/burstK/minAtrPct/cooldown/macroGate/entryMode), keeps the best
**only if** it beats the leader by `evolveMargin`, prunes the worst when over `maxArms`. Every
change is written to `_state/params.json` with a timestamped changelog. Guardrails are hard-coded:
TP never below the fee floor; the FLAT arm and the live arm are never pruned.

## Use it

```bash
cd .claude/skills/alpaca-aggressive-scalper
# --- autopilot (what the /loop runs) ---
node run.mjs tick   "BTC/USD,ETH/USD" 100000        # ONE call/tick -> ready-to-execute plan per pair
node run.mjs opened "ETH/USD" 1860 0.5 A1 0.0012    # record a BUY fill (px qty arm atrPctEntry)
node run.mjs closed "ETH/USD" 1875 take-profit      # record a SELL fill (px exitReason) -> logs net pnl
# --- manual / inspection ---
node run.mjs decide "BTC/USD" [long entryPx peakSince heldBars atrPctEntry]   # FAST live signal (active arm)
node run.mjs scan   "BTC/USD,ETH/USD,SOL/USD"       # any BUY setups now? (best trading arm; shows atr%/rsi/obi)
node run.mjs learn  "BTC/USD" 14                     # re-score arms on real 1Min bars + self-modify
node run.mjs size   "BTC/USD" 100000                 # ATR-risk notional (risk 2.5% equity off the stop)
node run.mjs arms / status                           # arm grid + bandit stats / config + changelog
```

`decide` returns `{action, reason, price, target, stop, tpPct, stopPct, atrPct, obi, makerLimitPx, ...}`
plus `buyConsensus` and the maker/taker round-trip costs. Pass `long <entryPx> <peakSince> <heldBars>
<atrPctEntry>` when you already hold so it evaluates the ATR-adaptive trail/stop/exits.

## Autopilot — fully automated via Claude `/loop` (paper account)

The whole 1-minute cycle is **one cheap node call** (`tick`); Claude executes the named orders via
the Alpaca MCP and writes the fills back. Start it with:

```
/loop 1m Autopilot the alpaca-aggressive-scalper on BTC/USD,ETH/USD (Alpaca paper). Each tick run `node run.mjs tick "BTC/USD,ETH/USD" <equity>`; for every plan item action BUY place the POST-ONLY limit order via Alpaca MCP place_crypto_order (type=limit, limit_price=order.price, time_in_force=gtc) then `node run.mjs opened <SYM> <fillPx> <fillQty> <arm> <atrPctEntry>`; for action SELL close_position via MCP then `node run.mjs closed <SYM> <fillPx> <reason>`; if learnDue run the learnHint; append one line to _state/SESSIONS.md; if clearDue is true, run /clear LAST (after everything else) to reset context.
```

Each tick, Claude does exactly:
1. (optional) `get_account_info` → real equity. Then `node run.mjs tick "<pairs>" <equity>`.
2. For each `plan[i]`:
   - **BUY** → place a **limit** order at `order.price` (post-only so it's a maker fill);
     on fill → `node run.mjs opened <sym> <fillPx> <fillQty> <arm> <order.atrPctEntry>`.
     *If the limit doesn't fill within the bar, cancel it — a missed maker fill beats a paid taker fill.*
   - **SELL** → `close_position(sym)`; on fill → `node run.mjs closed <sym> <fillPx> <reason>`
     (pass `take-profit` if `exitVia` was a maker limit, else the stop/trail/time reason).
   - **HOLD** → do nothing.
3. If `learnDue` (≈ hourly), run the `learnHint` — re-tunes + self-modifies the arm grid.
4. Append one line to `_state/SESSIONS.md`.
5. **If `clearDue` is true** (every 20th tick ≈ 20 min), run **`/clear`** as the *last* action of the
   tick — it resets the session context so the loop stays cheap. State lives in `_state/`, so `/clear`
   loses nothing; the next `/loop` tick re-injects these instructions automatically.

**Position memory:** `tick` reads/writes `_state/positions.json`, recomputing peak-since-entry and
bars-held each tick (and carrying `atrPctEntry`), so the ATR-adaptive exits work across ticks. An
open position is always managed by **the arm that opened it**.

**It trades from tick one, then proves itself or stands down.** On a cold start it runs the
aggressive **A1** arm and will fire on the next qualifying burst/breakout (subject to the ATR + obi
gates). The first hourly `learn` re-scores every arm on real recent bars; in chop it typically
**demotes to A0 (FLAT)** — every tick then returns HOLD and **no orders are placed**, which is
correct. It re-promotes an aggressive arm only when one clears the maker fee floor on recent real
bars. `SESSIONS.md` records each transition.

**Prereq:** the Alpaca MCP server must be running on the **paper** account (`ALPACA_PAPER_TRADE=true`)
— use the `run-alpaca-mcp` skill if it isn't up.

## Guardrails

- Long/flat spot only (Alpaca can't short crypto). The FLAT arm IS a valid, often-correct answer.
- **Maker-first is the whole point.** Place entries and take-profits as **limit** orders so they're
  maker fills (0.15%). If you route them as market orders you pay taker (0.25%) and the edge
  evaporates — the fee math in this skill assumes maker entries + maker TP exits.
- **Turnover is still the enemy** — halving the fee floor doesn't create alpha. Honour `minAtrPct`,
  the cooldown, and the fee floor; never set `tpAtrMult×ATR%` below `feeFloor`. More trades = more bleed.
- **Don't per-window fit.** The learner re-scores on a rolling recent window by design; never
  hand-tune an arm to a pretty backtest. Trust the FLAT default until paper proves a trader.
- **Sanity-check `obi`** from the public quote feed before leaning on it; if top-of-book size looks
  degenerate (e.g. ~0), treat the imbalance gate as neutral.
- Paper account only for now; **no order is placed** until you explicitly connect the live server
  and confirm. Re-measure the real spread from the orderbook before sizing on a live account.
- State lives in `_state/` (`params.json`, `decisions.ndjson`, `outcomes.ndjson`, `positions.json`).
  It is the memory — back it up, don't hand-edit `params.json` mid-session.
