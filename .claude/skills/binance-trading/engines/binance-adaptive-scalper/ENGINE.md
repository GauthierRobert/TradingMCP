---
name: binance-adaptive-scalper
description: Fast 1-minute long/flat crypto momentum scalper for Binance spot that learns and re-tunes itself. Each bar it makes a quick BUY/SELL/HOLD call from an EMA-stack + Donchian-breakout + RSI/volume signal; a counterfactual multi-armed bandit scores a grid of parameter "arms" (plus a FLAT arm) on real recent 1m bars AND on actual fills, then self-modifies the grid toward what works. Medium-aggressive, fee-aware. Binance fees (0.10%/fill) are far lower than Alpaca's, so the fee floor is easier to clear. Use for short-term 1-min timing on Binance (BTCUSDT, ETHUSDT, …). SIMULATION-ONLY by default; independent of the Alpaca scalpers.
allowed-tools: mcp__binance__getKlines, mcp__binance__getPrice, mcp__binance__getOrderBook, mcp__binance__get24hStats, mcp__binance__getAccount, mcp__binance__getMyTrades, mcp__binance__getOpenOrders, mcp__binance__getOrder, mcp__binance__placeOrder, mcp__binance__cancelOrder, Read, Write, Bash, Glob, Grep
---

# Adaptive scalper for Binance — fast 1-minute timing that tunes itself

A **self-learning** short-term engine for **Binance spot**. On every 1-minute bar it makes a
**fast** long/flat decision, and between decisions it **re-scores and re-shapes its own strategy**
from feedback on real and fictive sessions. One small data fetch (public Binance klines), simple
causal math → sub-second `decide`. Built so you **don't miss the window**: it checks fast and acts
on a confirmed momentum trigger.

This is a **direct port of `alpaca-adaptive-scalper`** to Binance. The learning core (`scalper.mjs`)
is **identical and venue-agnostic** — it operates on `{o,h,l,c,v,t}` candle arrays. Only `run.mjs`
is Binance-specific: it fetches **public Binance 1m klines** (no API key) and emits order hints that
target the **Binance MCP** (`mcp__binance__placeOrder`).

> **What's different from the Alpaca version (and why it matters):**
> - **Pairs** are Binance USDT symbols — `BTCUSDT`, `ETHUSDT` (no slash). `run.mjs` normalizes
>   `BTC/USDT`, `btcusdt`, even `BTCUSD` → `BTCUSDT`.
> - **Fees are MUCH lower.** Binance spot is **0.10%/fill** (0.20% round-trip) vs Alpaca's
>   ~0.40–0.48%. With a tight major-pair spread the **fee floor is ~0.33%** here vs ~0.58% on
>   Alpaca. Lower turnover cost ≈ **halves the bleed** (see Evidence) — the single biggest reason
>   to prefer Binance for a 1-minute scalper.
> - **No paper account.** Alpaca has a real paper venue that fills orders; Binance does not. The
>   Binance MCP ships with `BINANCE_TRADING_ENABLED=false`, which **blocks all live orders**. So
>   this skill is **SIMULATION-ONLY by default**: the autopilot computes the plan and logs *fictive*
>   fills; it places a **real** order only if you explicitly enable live trading (see "Mode" below).

## Mode: SIMULATION-ONLY by default

| | Alpaca scalper | **This (Binance) scalper** |
|---|---|---|
| Default venue | Alpaca **paper** (real fills) | **Simulation** (no order placed) |
| Live switch | point at live server | set `BINANCE_TRADING_ENABLED=true` **and** user opt-in |
| Order tool | `place_crypto_order` / `close_position` | `mcp__binance__placeOrder` (BUY=`quoteOrderQty`, SELL=`quantity`) |

**Never place a live Binance order** unless the user explicitly asks **and** the server has
`BINANCE_TRADING_ENABLED=true`. In simulation mode, when a tick returns a BUY/SELL you record the
fictive fill (`opened`/`closed`) at the plan's price instead of hitting the MCP — the learner still
gets ground-truth-shaped feedback, with zero risk.

## Read this first — the honest evidence (measured 2026-06-03, real Binance 5m bars)

> **The live clock is now 1m** (changed from 5m). The table below was measured on **5m** bars — the
> *kinder* baseline. A 1-minute clock turns over ~5× faster, so the bleed below is a **lower bound**:
> expect it worse at 1 minute (Binance's lower fee softens it, but does not erase it). Re-run `learn`
> to re-measure on real 1m bars.

Net of Binance's **~0.23% round-trip** (0.10% maker + 0.10% taker + ~0.03% spread), over the recent
14 days (a choppy / down regime), every trading arm is still **net-negative** — but **bleeds far
less than on Alpaca**:

| Arm | trades | win% | sumPnl% (Binance) | same arm on Alpaca |
|---|---|---|---|---|
| A2 runner (wide tp) | 62 | 15% | **−16.7%** | −32.9% |
| A1 balanced | 66 | 14% | **−17.5%** | −32.6% |
| A5 tight-momo | 72 | 11% | **−19.9%** | −34.2% |
| A3 quick | 82 | 10% | **−22.2%** | −40.5% |
| A4 breakout-strict | 17 | 6% | **−5.9%** | −4.9% |

**What this proves:** halving the fee roughly **halves the loss** and **doubles–triples the win
rate** — the fee floor is the dominant variable at a fast scalping cadence, exactly as the project's
thesis predicts. But in *this* chop/down regime, lower fees are **still not enough to beat cash**.
So the engine ships on the **FLAT arm (A0)** and starts there. The bandit only *leaves* cash if a
trading arm shows a **positive net-of-fee** EW mean on recent real bars.

**Treat any positive edge as unproven until you've seen it on live/recent data.** The skill's value
is the *adaptive harness*: it deploys a trading arm **only** when one genuinely earns it on Binance
data, and otherwise preserves capital — automatically. Binance's cheaper fees make "earning it"
materially more likely than on Alpaca, but the learner, not optimism, makes the call.

## How a decision is made (fast, causal, 1m) — identical to the Alpaca engine

Compute on the last bar only (arrays precomputed once):

- **Trend stack** — EMA(9)/EMA(21)/EMA(50). `slopeBars` guard: EMA(50) must be rising.
- **Entry (flat→long)**, medium-aggressive — either trigger fires:
  - **Breakout**: close > Donchian-high(`breakoutN`) AND EMA9>EMA21 AND RSI<`rsiMaxBuy` AND volume ≥ `volMult`×avg.
  - **Pullback** (only in `entryMode:"both"`): uptrend stack, price back near EMA21, RSI turning up.
- **Exit (long→flat)**, fast — hard stop / take-profit / armed trail / trend-break below EMA50
  (after `minHold` bars) / time-stop at `maxHold`. A `cooldown` blocks instant re-entry.
- **Fee floor** — an arm's `tpPct` must exceed `2·fee + spread + buffer` (**~0.33% on Binance**) or
  its BUY is suppressed.

## The self-learning loop & self-modification — identical core

Each `learn` pass: (1) **fictive** dense feedback — every arm counterfactually simulated over the
recent 1m window, net-of-fee P&L is the reward; (2) **real** feedback — actual fills logged via
`record`/`closed` folded in, weighted ×`realWeight`; (3) **bandit** — per-arm discounted
exponentially-weighted mean, live `decide` exploits the leader (FLAT wins ties at 0). After scoring,
`learn` **evolves the grid** (bounded neighbour arms around the best trader, kept only if they beat
the leader by `evolveMargin`, worst pruned over `maxArms`); FLAT and the live arm are never pruned;
TP can never drop below the fee floor. Every change is written to `_state/params.json` `changelog`.

## Use it

```bash
cd .claude/skills/binance-trading/engines/binance-adaptive-scalper
# --- autopilot (what the /loop runs) ---
node run.mjs tick    "BTCUSDT,ETHUSDT,DOTUSDT,SOLUSDT,AVAXUSDT,XRPUSDT,LINKUSDT" 100000   # ONE call/tick -> plan per pair
node run.mjs opened  "ETHUSDT" 1860 0.5 A1      # record an executed/fictive BUY fill (px qty arm)
node run.mjs closed  "ETHUSDT" 1875             # record an executed/fictive SELL fill -> logs net pnl
# --- manual / inspection ---
node run.mjs decide  "BTCUSDT" [long entryPx peakSince heldBars]   # FAST live signal (active arm)
node run.mjs scan    "BTCUSDT,ETHUSDT,DOTUSDT,SOLUSDT,AVAXUSDT,XRPUSDT,LINKUSDT"   # any BUY setups now? (best trading arm)
node run.mjs learn   "BTCUSDT" 14                                  # re-score arms on real 1m bars + self-modify
node run.mjs size    "BTCUSDT" 100000                             # risk-based notional (1.5% equity off the stop)
node run.mjs arms / status                                       # arm grid + bandit stats / config + changelog
```

`decide` returns `{action: BUY|SELL|HOLD, reason, price, target, stop, ...}` plus `buyConsensus`
and the live fee floor. Data comes straight from Binance's public klines endpoint (no key); for
geo-resilience `run.mjs` falls back across `api.binance.com` → `data-api.binance.vision` →
`api-gcp.binance.com`.

## Autopilot — fully automated via Claude `/loop`

One cheap node call (`tick`) returns a ready-to-execute plan; Claude executes (or simulates) the
named orders and writes the fills back. Start it with:

```
/loop 1m Autopilot the binance-adaptive-scalper on BTCUSDT,ETHUSDT,DOTUSDT,SOLUSDT,AVAXUSDT,XRPUSDT,LINKUSDT. Each tick: cd into .claude/skills/binance-trading/engines/binance-adaptive-scalper and run `node run.mjs tick "BTCUSDT,ETHUSDT,DOTUSDT,SOLUSDT,AVAXUSDT,XRPUSDT,LINKUSDT" <equity>` (use getAccount USDT balance if trading-enabled, else 100000). For every plan item action BUY: if BINANCE_TRADING_ENABLED=true AND the user opted into live trading, placeOrder(sym,"BUY","MARKET",quoteOrderQty=order.notional) then `node run.mjs opened <SYM> <fillPx> <fillQty> <arm>`; otherwise (simulation) just `node run.mjs opened <SYM> <planPrice> <order.qty> <arm>`. For action SELL: live -> placeOrder(sym,"SELL","MARKET",quantity=qty) then `node run.mjs closed <SYM> <fillPx>`; sim -> `node run.mjs closed <SYM> <planPrice>`. HOLD -> nothing. If learnDue run the learnHint. Append one line to _state/SESSIONS.md; if clearDue is true, run /clear LAST (after everything else) to reset context.
```

Each tick, Claude does exactly:
1. (optional, live only) `getAccount` → USDT balance as equity. Then `node run.mjs tick "<pairs>" <equity>`.
2. For each `plan[i]`:
   - **BUY** → live: `placeOrder(sym,"BUY","MARKET",quoteOrderQty=order.notional)`; sim: skip the order.
     Either way → `node run.mjs opened <sym> <fillPx|planPrice> <fillQty|order.qty> <arm>`.
   - **SELL** → live: `placeOrder(sym,"SELL","MARKET",quantity=qty)`; sim: skip the order.
     Either way → `node run.mjs closed <sym> <fillPx|planPrice>`.
   - **HOLD** → do nothing.
3. If `learnDue` (≈ hourly), run the `learnHint` command — re-tunes + self-modifies the arm grid.
4. Append one line to `_state/SESSIONS.md`.
5. **If `clearDue` is true** (every 20th tick ≈ 20 min), run **`/clear`** as the *last* action of the
   tick — it resets the session context so the loop stays cheap. State lives in `_state/`, so `/clear`
   loses nothing; the next `/loop` tick re-injects these instructions automatically.

**Position memory:** `tick` reads/writes `_state/positions.json`, recomputing peak-since-entry and
bars-held each tick, so exits (stop/trail/TP/time) work correctly across ticks. An open position is
always managed by **the arm that opened it**, even if the live arm has since changed.

**Expect mostly FLAT at first.** While A0 (FLAT) is active, every tick returns HOLD and **no orders
are placed** — correct and intended. The autopilot only starts trading once a `learn` pass promotes
a trading arm that clears the fee floor on recent real Binance bars. Binance's lower fees make that
more reachable than on Alpaca, but it still has to be earned on data.

**To stop:** end the `/loop` or close the session. State in `_state/` persists, so the next session
resumes where it left off.

**Prereq:** the **Binance MCP server** must be running for live order placement (use the
`run-binance-mcp` skill). For **simulation mode the MCP is not even required** — `run.mjs` pulls its
own market data from Binance's public REST, so `tick`/`learn`/`scan` all work standalone.

## Guardrails

- Long/flat spot only (no shorting). The FLAT arm IS a valid, often-correct answer.
- **Turnover is the enemy at 1 minute** (even more than at 5) — even at Binance's lower fee. Honour the fee floor and the
  cooldown; never loosen TP below `feeFloor`. "Trade more" still means "lose more" in chop.
- **Don't per-window fit.** The learner re-scores on a rolling recent window by design; never
  hand-tune an arm to a pretty backtest. Trust the FLAT default until the data proves a trader.
- **SIMULATION-ONLY by default.** A live Binance order requires BOTH `BINANCE_TRADING_ENABLED=true`
  AND an explicit user request. Never place a live order to "test". Re-measure the real spread from
  `getOrderBook` before sizing live.
- State lives in `_state/` (`params.json`, `decisions.ndjson`, `outcomes.ndjson`, `positions.json`).
  It is the memory — back it up, don't hand-edit `params.json` mid-session.
