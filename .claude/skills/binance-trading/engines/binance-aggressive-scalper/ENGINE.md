---
name: binance-aggressive-scalper
description: VERY AGGRESSIVE 1-minute long/flat crypto scalper for BINANCE spot — takes every qualifying momentum setup fast, kept survivable by a fee-aware design ported from the Alpaca aggressive scalper. LIMIT_MAKER (post-only) entries, an ATR volatility gate (only fire when the expected move clears the fee floor), and live order-book imbalance confirmation. ATR-adaptive take-profit/stop/trail, momentum-burst + micro-breakout entries, near-zero cooldown. A counterfactual bandit scores a grid of aggressive arms (plus a FLAT safety arm) on real 1m klines + fills and self-tunes. Fee-aware (Binance 0.10% maker==taker). SIMULATION-ONLY by default (BINANCE_TRADING_ENABLED=false); independent state from the other skills. For Alpaca crypto, use alpaca-aggressive-scalper instead.
allowed-tools: mcp__binance__getPrice, mcp__binance__getKlines, mcp__binance__getOrderBook, mcp__binance__get24hStats, mcp__binance__getAccount, mcp__binance__getOpenOrders, mcp__binance__getOrder, mcp__binance__getMyTrades, mcp__binance__placeOrder, mcp__binance__cancelOrder, mcp__binance__getExchangeInfo, Read, Write, Bash
---

# Binance aggressive scalper — fast 1-minute momentum, fee-honest

The **Binance spot port** of `alpaca-aggressive-scalper`. Same very-aggressive engine: on every
1-minute bar it takes **every qualifying momentum setup** — bursts, micro-breakouts, pullback-
continuations — with a near-zero cooldown. The strategy logic (`engine.mjs`) is **identical and
shared in design**; only the **data source** (Binance public REST), **symbols** (`BTCUSDT`), and
the **fee model** differ. It keeps its own `_state/` so it learns independently.

> **Mode: SIMULATION-ONLY by default.** The Binance MCP ships with `BINANCE_TRADING_ENABLED=false`,
> so live orders are blocked. `tick` returns a ready-to-execute plan; place orders only when you
> deliberately enable trading and confirm. Market **data** needs no auth and no MCP — `run.mjs`
> fetches Binance's public klines/bookTicker directly, so `learn`/`scan`/`tick` work offline of the MCP.

## What changed vs the Alpaca skill — the fee math

| | Alpaca crypto | Binance spot |
|---|---|---|
| Maker fee | 0.15% | **0.10%** (0.075% with BNB) |
| Taker fee | 0.25% | **0.10%** (0.075% with BNB) |
| Maker-first **discount** | yes (0.15 vs 0.25) — the headline lever | **none** — maker == taker |
| Round-trip floor (modelled) | ~0.42% maker / ~0.56% taker | **~0.26%** (2×0.10% + ~0.02% spread + buffer) |

**The key insight:** on Binance the "maker-first" lever gives **no fee discount** (maker = taker),
so a `LIMIT_MAKER` entry buys only *guaranteed no-taker + price improvement*, not a cheaper fee.
But the **absolute fee floor is lower** (~0.26% vs Alpaca's ~0.42% maker), because Binance's per-fill
fee is lower and majors' spreads are razor-thin. That lower floor is why the same arms **bled less**
in the first learn pass on Binance (A1 −16.8% / A3 −31.9% over 14d) than on Alpaca (−49% / −71%).
Lower floor ≠ profitable, though — see below.

Fees are paid the same on both exit legs (maker == taker), so exits use a plain **MARKET sell** for
certainty; entries stay **LIMIT_MAKER** for the price-improvement + no-taker guarantee. Set
`makerFee`/`takerFee` to `0.00075` in `_state/params.json` if you pay fees in BNB.

## Read this first — the honest evidence (measured 2026-06-03, real Binance 5m klines)

> **The live clock is now 1m** (changed from 5m). The table below was measured on **5m** klines — the
> *kinder* baseline. A 1-minute clock turns over ~5× faster, so the bleed below is a **lower bound**:
> expect it worse at 1 minute (Binance's lower floor softens it, not erases it). Re-run `learn` to
> re-measure on real 1m klines.

`node run.mjs learn "BTCUSDT" 14` over **4,032 real 5m bars**:

| Arm | trades | win% | net sumPnl | verdict |
|---|---|---|---|---|
| A3 ultra-fast | 127 | 10% | **−32%** | over-trades; bleeds even at 0.10% fees |
| A1 aggressive momentum | 72 | 17% | **−17%** | bleeds |
| A2 burst-runner | 68 | 15% | **−16%** | bleeds |
| A4 expansion-gated | 1 | 100% | +0.18% | barely traded (gate selective); 1 sample ≠ proof |
| **A0 FLAT (safety)** | — | — | **0%** | **bandit promoted this — the honest winner** |

Same lesson as Alpaca: **aggressive scalping bleeds in chop**, even with Binance's lower floor.
The bandit correctly **demoted A1 → A0 (FLAT)** on the first pass. **Treat any positive edge as
unproven until live/paper fills confirm it.** The value is the *harness*: it deploys an aggressive
arm **only** when one earns it on recent real bars, and otherwise preserves capital. It ships seeded
on **A1** (trades from tick one), then the first hourly `learn` demotes it to FLAT if aggression
isn't clearing the floor — which is what happened above. Correct, not a bug.

## How a decision is made

Identical to the Alpaca sibling — see that file for the full description. In brief, on the last bar:
**ATR(7) volatility gate** → **EMA(9/21/50) trend posture** → **entry** (breakout / momentum-burst /
pullback-continuation, RSI < `rsiMaxBuy`, live `obi ≥ obiBuy`) → **ATR-adaptive exits** (take-profit
clamped ≥ fee floor, stop, armed trail, EMA21 trend-break, time-stop) → short `cooldown`. The
counterfactual bandit re-scores every arm each `learn` and evolves the grid.

## Use it

```bash
cd .claude/skills/binance-trading/engines/binance-aggressive-scalper
node run.mjs tick   "BTCUSDT,ETHUSDT,DOTUSDT,SOLUSDT,AVAXUSDT,XRPUSDT,LINKUSDT" 1000   # ONE call/tick -> plan per pair
node run.mjs opened "ETHUSDT" 1860 0.5 A1 0.0012    # record a BUY fill (px qty arm atrPctEntry)
node run.mjs closed "ETHUSDT" 1875 take-profit      # record a SELL fill (px exitReason) -> logs net pnl
node run.mjs decide "BTCUSDT" [long entryPx peakSince heldBars atrPctEntry]   # FAST live signal
node run.mjs scan   "BTCUSDT,ETHUSDT,DOTUSDT,SOLUSDT,AVAXUSDT,XRPUSDT,LINKUSDT"  # any BUY setups now? (atr%/rsi/obi)
node run.mjs learn  "BTCUSDT" 14                     # re-score arms on real 1m klines + self-modify
node run.mjs size   "BTCUSDT" 1000                  # ATR-risk notional (risk 2.5% equity off the stop)
node run.mjs arms / status                           # arm grid + bandit stats / config + changelog
```

Symbols are **Binance-native** (`BTCUSDT`, `ETHUSDT`, no slash). Equity is in USDT.

## Autopilot — via Claude `/loop` (simulation by default)

The whole 1-minute cycle is one cheap `tick` call; Claude executes the named orders via the Binance
MCP and writes fills back. Default universe is 7 USDT pairs (BTC, ETH, DOT, SOL, AVAX, XRP, LINK).
Start it with:

```
/loop 1m Autopilot the binance-aggressive-scalper on BTCUSDT,ETHUSDT,DOTUSDT,SOLUSDT,AVAXUSDT,XRPUSDT,LINKUSDT (Binance spot, SIM unless trading enabled). Each tick run `node run.mjs tick "BTCUSDT,ETHUSDT,DOTUSDT,SOLUSDT,AVAXUSDT,XRPUSDT,LINKUSDT" <equity>` in .claude/skills/binance-trading/engines/binance-aggressive-scalper; for every plan item action BUY place the order via order.execute (mcp__binance__placeOrder LIMIT_MAKER) then `node run.mjs opened <SYM> <fillPx> <fillQty> <arm> <atrPctEntry>`; for action SELL place the MARKET sell via order.execute then `node run.mjs closed <SYM> <fillPx> <reason>`; if learnDue run the learnHint; append one line to _state/SESSIONS.md; if clearDue is true, run /clear LAST (after everything else) to reset context.
```

> **Sizing note with 7 pairs:** each entry is risk-sized (2.5% equity off the stop) and capped at
> `maxWeight` (35% of equity). If several pairs fire at once on a small balance you can exceed cash —
> the bandit usually keeps most pairs FLAT, but lower `riskPct`/`maxWeight` in `_state/params.json`
> if you want a hard multi-position cap.

Each tick, Claude does exactly:
1. (optional) `mcp__binance__getAccount` → real USDT equity + your actual fee tier. Then `node run.mjs tick "<pairs>" <equity>`.
2. For each `plan[i]`:
   - **BUY** → `mcp__binance__placeOrder(symbol, side="BUY", type="LIMIT_MAKER", quantity=order.qty, price=order.price)`;
     on fill → `node run.mjs opened <sym> <fillPx> <fillQty> <arm> <order.atrPctEntry>`.
     *If it doesn't fill within the bar, `cancelOrder` it — a missed maker fill beats chasing.*
   - **SELL** → `mcp__binance__placeOrder(symbol, side="SELL", type="MARKET", quantity=<qty>)`;
     on fill → `node run.mjs closed <sym> <fillPx> <reason>`.
   - **HOLD** → do nothing.
3. If `learnDue` (≈ hourly), run the `learnHint`.
4. Append one line to `_state/SESSIONS.md`.
5. **If `clearDue` is true** (every 20th tick ≈ 20 min), run **`/clear`** as the *last* action of the
   tick — it resets the session context so the loop stays cheap. State lives in `_state/`, so `/clear`
   loses nothing; the next `/loop` tick re-injects these instructions automatically.

**Position memory:** `tick` reads/writes `_state/positions.json`, recomputing peak-since-entry and
bars-held each tick, so the ATR-adaptive exits work across ticks. An open position is always managed
by the arm that opened it.

**Prereq for live execution:** the Binance MCP server must be running AND `BINANCE_TRADING_ENABLED=true`.
By default it is `false`, so the autopilot will compute plans and learn but cannot place real orders —
which is the safe default. Lot-size/tick-size: respect each symbol's filters (`getExchangeInfo`); the
plan rounds price to 0.01 and qty to 6 dp, fine for BTCUSDT/ETHUSDT — re-check for alts.

## Guardrails

- Long/flat spot only (no shorting). The FLAT arm IS a valid, often-correct answer.
- **Turnover is the enemy.** The lower Binance floor does NOT create alpha — honour `minAtrPct`,
  the cooldown, and the fee floor; never set `tpAtrMult×ATR%` below the floor.
- **Don't per-window fit.** The learner re-scores on a rolling recent window by design; trust the
  FLAT default until real fills prove a trader.
- **Sanity-check `obi`** from bookTicker before leaning on it; thin/odd top-of-book → treat neutral.
- **Geo / venue:** binance.com may be restricted in some regions (e.g. US → use binance.us or a
  permitted account). Public data worked from this machine; live trading depends on your account.
- Simulation by default; **no live order** until `BINANCE_TRADING_ENABLED=true` and you confirm.
- State lives in `_state/` (`params.json`, `decisions.ndjson`, `outcomes.ndjson`, `positions.json`) —
  it is the memory. Independent from the Alpaca skill's state.
