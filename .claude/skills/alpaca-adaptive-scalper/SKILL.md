---
name: alpaca-adaptive-scalper
description: Fast 1-minute long/flat crypto momentum scalper for Alpaca that learns and re-tunes itself. Each bar it makes a quick BUY/SELL/HOLD call from an EMA-stack + Donchian-breakout + RSI/volume signal; a counterfactual multi-armed bandit scores a grid of parameter "arms" (plus a FLAT arm) on real recent bars AND on actual fills, then self-modifies the grid toward what works. Medium-aggressive, fee-aware. Use for short-term 1-min timing where you don't want to miss fast windows. Targets the Alpaca PAPER account; independent of the alpaca trio.
allowed-tools: mcp__alpaca__get_crypto_snapshot, mcp__alpaca__get_crypto_bars, mcp__alpaca__get_crypto_latest_bar, mcp__alpaca__get_crypto_latest_quote, mcp__alpaca__get_crypto_latest_orderbook, mcp__alpaca__get_account_info, mcp__alpaca__get_all_positions, mcp__alpaca__get_open_position, mcp__alpaca__get_orders, mcp__alpaca__place_crypto_order, mcp__alpaca__close_position, Read, Write, Bash
---

# Adaptive scalper — fast 1-minute timing that tunes itself

A **self-learning** short-term engine. On every 1-minute bar it makes a **fast** long/flat
decision, and between decisions it **re-scores and re-shapes its own strategy** from feedback on
real and fictive sessions. One small data fetch, simple causal math → sub-second `decide`. Built so
you **don't miss the window**: it checks fast and acts on a confirmed momentum trigger.

This is the **fifth, independent** Alpaca skill — it shares no code with the trio
(`alpaca-regime-router` / `alpaca-trend-participation` / `alpaca-risk-portfolio`). Its whole point is
a *different clock* (1Min vs 1Hour) plus an *online learning loop* those skills don't have.

> **Mode: PAPER account, auto-trading via Claude `/loop`.** It runs on the **Alpaca paper account**
> (real fills feed the learner). The autopilot (`tick`) returns a ready-to-execute plan and Claude
> places the **paper** orders via the Alpaca MCP each 1-min tick. **No live-money trading** — paper
> only, until you deliberately point it at a live server.

## Read this first — the honest evidence (measured 2026-06-03)

> **The live clock is now 1Min** (changed from 5Min). The table below was measured on **5Min** bars
> — it is the *kinder* baseline. A 1-minute clock turns over ~5× faster, so the fee bleed below is a
> **lower bound**: expect it to be strictly worse at 1 minute. Everything the table proves about the
> fee floor applies *more* sharply now. Re-run `learn` to re-measure on real 1Min bars.

I measured the engine on real Alpaca 5Min bars, net of Alpaca's **~0.48% round-trip**
(0.15% maker + 0.25% taker + ~0.08% spread). The verdict is blunt and matches the rest of this project:

| Window | Arm | trades | net sumPnl | note |
|---|---|---|---|---|
| BULL 2024-10→12 (BTC +52%) | A1 (aggressive) | 508 | **−230%** | over-trades; fees obliterate it |
| BULL 2024-10→12 (BTC +52%) | A4 (selective)  | 111 | **−47%**  | far better, still bleeds |
| BULL 2023-10→24-03 (BTC +56%) | A4 (selective) | 98 | **−44%** | even a huge bull can't clear the fee floor |
| recent 14d (chop/down) | every trading arm | 60–90 | −33% to −41% | bleed |

**What this proves:** at a 5-minute cadence, mechanical long/flat scalping on Alpaca **cannot beat
the fee floor — not even in a +50% bull** — because turnover is the enemy and each trade's edge can't
clear ~0.48%. More trades = more bleed. This is the same lesson the 1-Hour skills learned, only
sharper at 5 minutes — and **sharper still at the 1-minute clock this skill now runs.**

**So the engine ships with a `FLAT` arm (A0) and starts on it.** The bandit only *leaves* cash if a
trading arm shows a **positive net-of-fee** EW mean on recent real bars. In every window I tested,
the honest choice was FLAT. **Treat any positive edge as unproven until the paper account shows it.**
The skill's real value is the *adaptive harness*: it will deploy a trading arm **only** when one
genuinely earns it, and otherwise it preserves capital — automatically.

## How a decision is made (fast, causal, 1Min)

Compute on the last bar only (arrays precomputed once):

- **Trend stack** — EMA(9)/EMA(21)/EMA(50). `slopeBars` guard: EMA(50) must be rising (light — we
  do *not* require a slow macro veto; that's what keeps it responsive).
- **Entry (flat→long)**, medium-aggressive — either trigger fires:
  - **Breakout**: close > Donchian-high(`breakoutN`) AND EMA9>EMA21 AND RSI<`rsiMaxBuy` AND volume ≥ `volMult`×avg.
  - **Pullback** (only in `entryMode:"both"`): uptrend stack, price back near EMA21, RSI turning up.
- **Exit (long→flat)**, fast — hard stop / take-profit / armed trail / trend-break below EMA50
  (after `minHold` bars) / time-stop at `maxHold`. A `cooldown` blocks instant re-entry (anti-churn).
- **Fee floor** — an arm's `tpPct` must exceed `2·fee + spread + buffer` (~0.58%) or its BUY is
  suppressed. No trade is taken that mathematically can't clear cost.

## The self-learning loop (real + fictive feedback)

Each `learn` pass:
1. **Fictive (dense) feedback** — every arm is *counterfactually* simulated over the recent 1Min
   window; each completed shadow trade's **net-of-fee P&L is the reward**. This scores all arms on
   the same real price action even though only one trades live — exploration is free, no real risk.
2. **Real (ground-truth) feedback** — actual paper fills logged via `record` are folded into the arm
   that produced them, weighted **×`realWeight`** (default 3) so real outcomes count more than fictive.
3. **Bandit** — per-arm **discounted exponentially-weighted mean** (recency-weighted; `alpha`/`gamma`).
   Live `decide` **exploits the leader** (the FLAT arm wins ties at 0 when all traders are negative).

## Self-modification (it rewrites its own config)

After scoring, `learn` **evolves the grid**: it spawns bounded neighbour arms around the best trading
arm (±steps on tp/stop/trail/maxHold/breakoutN/entryMode), keeps the best one **only if** it beats the
leader by `evolveMargin`, and prunes the worst arm when over `maxArms`. Every change is written to
`_state/params.json` with a timestamped `changelog`. Guardrails are hard-coded: TP can never drop
below the fee floor; stop/trail/hold stay in sane bounds; the FLAT arm and the live arm are never pruned.

## Use it

```bash
cd .claude/skills/alpaca-adaptive-scalper
# --- autopilot (what the /loop runs) ---
node run.mjs tick    "BTC/USD,ETH/USD" 100000   # ONE call/tick -> a ready-to-execute plan per pair
node run.mjs opened  "ETH/USD" 1860 0.5 A1      # record an executed BUY fill (px qty arm)
node run.mjs closed  "ETH/USD" 1875             # record an executed SELL fill -> logs net pnl for learning
# --- manual / inspection ---
node run.mjs decide  "BTC/USD" [long entryPx peakSince heldBars]   # FAST live signal (active arm)
node run.mjs scan    "BTC/USD,ETH/USD,SOL/USD"                     # any BUY setups now? (best trading arm)
node run.mjs learn   "BTC/USD" 14                                  # re-score arms on real 1Min bars + self-modify
node run.mjs size    "BTC/USD" 100000                              # risk-based notional (1.5% equity off the stop)
node run.mjs arms / status                                       # arm grid + bandit stats / config + changelog
```

`decide` returns `{action: BUY|SELL|HOLD, reason, price, target, stop, ...}` plus `buyConsensus`
(how many arms agree) and the live fee floor. Pass `long <entryPx> <peakSince> <heldBars>` when you
already hold so it can evaluate the trail/stop/exits.

## Autopilot — fully automated via Claude `/loop` (paper account)

The tick cycle is **one cheap node call** (`tick`) that returns a ready-to-execute plan; Claude
executes the named orders via the Alpaca MCP and writes the fills back. Default cadence is **every
minute**, and the engine now **decides on 1Min bars** — one fresh decision per tick (the loop clock
and the bar clock are aligned). Start it with:

```
/loop 1m Autopilot the alpaca-adaptive-scalper on BTC/USD,ETH/USD (Alpaca paper). Each tick run `node run.mjs tick "BTC/USD,ETH/USD" <equity>`; for every plan item action BUY place the limit order via Alpaca MCP place_crypto_order then `node run.mjs opened <SYM> <fillPx> <fillQty> <arm>`; for action SELL close_position via MCP then `node run.mjs closed <SYM> <fillPx>`; if learnDue run the learnHint; append one line to _state/SESSIONS.md; if clearDue is true, run /clear LAST (after everything else) to reset context.
```

Each tick, Claude does exactly:
1. (optional) `get_account_info` → use real equity. Then `node run.mjs tick "<pairs>" <equity>`.
2. For each `plan[i]`:
   - **BUY** → `place_crypto_order(sym,"buy",notional=order.notional,type="limit",limit_price=price)`;
     on fill → `node run.mjs opened <sym> <fillPx> <fillQty> <arm>`.
   - **SELL** → `close_position(sym)`; on fill → `node run.mjs closed <sym> <fillPx>`.
   - **HOLD** → do nothing.
3. If `learnDue` (≈ hourly), run the `learnHint` command — re-tunes + self-modifies the arm grid.
4. Append one line to `_state/SESSIONS.md`.
5. **If `clearDue` is true** (every 20th tick ≈ 20 min), run **`/clear`** as the *last* action of the
   tick — it resets the session context so the loop stays cheap and fast. All trading/learning for the
   tick must already be done; state lives in `_state/`, so `/clear` loses nothing. The next `/loop`
   tick re-injects these instructions automatically.

**Position memory:** `tick` reads/writes `_state/positions.json`, recomputing peak-since-entry and
bars-held each tick, so exits (stop/trail/TP/time) work correctly across ticks. An open position is
always managed by **the arm that opened it**, even if the live arm has since changed.

**Expect mostly FLAT at first.** While the bandit's active arm is **A0 (FLAT)**, every tick returns
HOLD and **no orders are placed** — correct and intended. The autopilot only starts trading once a
`learn` pass promotes a trading arm that clears the fee floor on recent real bars. Let it run; it
will tell you in `SESSIONS.md` when it goes active.

**To stop:** end the `/loop` or close the session (it only runs while the session is open). State in
`_state/` persists, so the next session resumes where it left off.

**Prereq:** the Alpaca MCP server must be running and pointed at the **paper** account
(`ALPACA_PAPER_TRADE=true`) — use the `run-alpaca-mcp` skill if it isn't up.

## Guardrails

- Long/flat spot only (Alpaca can't short crypto). The FLAT arm IS a valid, often-correct answer.
- **Turnover is the enemy at 1 minute** (even more than at 5). Honour the fee floor and the cooldown; never loosen TP
  below `feeFloor`. If you want to "trade more," expect to lose more — the data is unambiguous.
- **Don't per-window fit.** The learner re-scores on a rolling recent window by design; never
  hand-tune an arm to a pretty backtest. Trust the FLAT default until paper proves a trader.
- Paper account only for now; **no order is placed** until you explicitly connect the live paper
  server and confirm. Re-measure the real spread from the orderbook before sizing on a live account.
- State lives in `_state/` (`params.json`, `decisions.ndjson`, `outcomes.ndjson`). It is the memory —
  back it up, don't hand-edit `params.json` mid-session.
