---
name: alpaca-equity-scalper
description: Fast 1-minute long/flat momentum scalper for US EQUITIES & ETFs on Alpaca (commission-free) that learns and re-tunes itself. Each 1-min bar it makes a quick BUY/SELL/HOLD call from an EMA-stack + Donchian-breakout + RSI/volume signal; a counterfactual bandit scores a grid of parameter "arms" (plus a FLAT arm) on real recent bars AND on actual fills, then self-modifies toward what works. Because stock/ETF trades are commission-free, the cost floor is ~0.08% (just spread) vs crypto's ~0.58% — about 7x lower — which is why a 1-min scalp can clear costs here where it cannot on crypto. Market-hours gated, IEX data, auth required. Trades SPY/QQQ/IWM/GLD/SLV/USO/TLT + megacaps (AAPL/MSFT/NVDA/AMZN/META). SIMULATION/paper by default; independent of the crypto scalpers.
allowed-tools: mcp__alpaca__*, Read, Write, Bash, Glob, Grep
---

# Adaptive scalper for US equities & ETFs — commission-free changes everything

A **self-learning** 1-minute long/flat momentum engine for **US stocks & ETFs** on Alpaca. Same
venue-agnostic core as the crypto `alpaca-adaptive-scalper` (identical `scalper.mjs`), but pointed
at equities — and that one change flips the economics.

> **Why this is the engine's best shot.** On crypto, Alpaca's **~0.48% round-trip fee** swallows any
> short-term edge — every trading arm bleeds, so the bandit correctly stays FLAT forever. Alpaca
> **stock/ETF trading is commission-free**, so the round-trip cost is essentially just the spread
> (~1–3 bps for SPY/QQQ/GLD, a few bps for megacaps). That drops the **cost floor from ~0.58% to
> ~0.08% — about 7×**. Measured on real 14-day IEX bars (2026-06-04), the *same arms that lost ~30%
> on crypto* are **net-positive** here (SPY/QQQ: 3–4 arms with positive net-of-cost EW means, 42–53%
> win rates), and the bandit **left FLAT** — promoting a trading arm for the first time. The fee
> floor was the whole story.
>
> ⚠️ **That positive read was measured on 5Min bars; the live clock is now 1Min** (5× the turnover).
> The spread-only floor still applies, but a thinner per-trade edge has to clear it more often — so
> **re-prove the edge with a fresh `learn` on 1Min bars before trusting it.** Don't assume the 5Min
> result carries over.

## What's different from the crypto scalper (and why it's a separate skill)

| | Crypto scalper | **This (equity) scalper** |
|---|---|---|
| Cost | ~0.48% round-trip fee | **commission-free** → spread-only floor (~0.08%) |
| Hours | 24/7 | **9:30–16:00 ET weekdays** → market-hours gated |
| Data | public crypto bars, no auth | **auth'd Alpaca IEX 1Min bars** (keys from env) |
| Symbols | BTC/USD, … | `SPY,QQQ,IWM,GLD,SLV,USO,TLT,AAPL,MSFT,NVDA,AMZN,META` |
| Order tool | `place_crypto_order` | `place_stock_order` (notional/fractional, `time_in_force:"day"`) |

Mixing the two into one bandit is incoherent (an arm tuned for 0.48% fees is wrong for 0% fees), so
this is an independent fork with its own `_state/`.

## Auth & data feed

`run.mjs` reads `ALPACA_API_KEY` / `ALPACA_SECRET_KEY` from the **environment** (Windows user env
vars) and queries the **IEX** feed (free tier; SIP requires a paid subscription and is blocked here).
IEX is a partial-volume view — fine for the liquid ETFs/megacaps in the default basket; do not add
illiquid names (their IEX bars are sparse and the fixed spread estimate would understate true cost).

## Market-hours gating (no timezone/DST/holiday code)

Open/closed is inferred from **data freshness**: if a symbol's latest 1Min bar is < 20 minutes old,
the market is trading; otherwise it's closed and the tick returns `marketOpen:false` and **HOLD for
everything — no orders**. This sidesteps all ET/DST/holiday-calendar bugs. Off-hours ticks are cheap
no-ops; an open position is simply held flat until RTH resumes. (Overnight gap risk is real — a big
move appears as one bar; standard intraday caveat.)

## How a decision is made — identical engine

Per last bar: EMA(9/21/50) stack with a rising-EMA50 guard; **entry** on Donchian breakout (close >
high(`breakoutN`), EMA9>EMA21, RSI<`rsiMaxBuy`, volume ≥ `volMult`×avg) or a pullback in
`entryMode:"both"`; **exit** on hard stop / take-profit / armed trail / trend-break / time-stop, with
a `cooldown` anti-churn. An arm's `tpPct` must exceed `2·fee + spread + buffer` (**~0.08% here**) or
its BUY is suppressed. The counterfactual bandit (discounted EW mean, `alpha`/`gamma`) scores all
arms each `learn` pass and `learn` evolves the grid (bounded neighbours, prune worst over `maxArms`,
FLAT + live arm never pruned, TP never below the cost floor).

## Use it

```bash
cd .claude/skills/alpaca-equity-scalper
# --- autopilot (what the /loop runs) ---
node run.mjs tick    "SPY,QQQ,IWM,GLD,SLV,USO,TLT,AAPL,MSFT,NVDA,AMZN,META" 100000   # plan per symbol
node run.mjs opened  "GLD" 410.9 5 A4      # record an executed/fictive BUY fill (px qty arm)
node run.mjs closed  "GLD" 413.2           # record an executed/fictive SELL fill -> logs net pnl
# --- manual / inspection ---
node run.mjs decide  "SPY" [long entryPx peakSince heldBars]   # FAST live signal (active arm)
node run.mjs scan    "SPY,QQQ,GLD"                             # any BUY setups now? (best trading arm)
node run.mjs learn   "SPY" 14                                  # re-score arms on real 1Min bars + self-modify
node run.mjs size    "SPY" 100000                             # risk-based notional (1.5% equity off the stop)
node run.mjs arms / status                                   # arm grid + bandit stats / config + changelog
```

## Autopilot — fully automated via Claude `/loop`

```
/loop 1m Autopilot the alpaca-equity-scalper on SPY,QQQ,IWM,GLD,SLV,USO,TLT,AAPL,MSFT,NVDA,AMZN,META (Alpaca paper, commission-free, market-hours gated). Each tick: cd into .claude/skills/alpaca-equity-scalper and run `node run.mjs tick "SPY,QQQ,IWM,GLD,SLV,USO,TLT,AAPL,MSFT,NVDA,AMZN,META" <equity>` (use get_account_info equity if Alpaca MCP tools are available, else 100000). If marketOpen=false, just log "market closed". Else for each plan item: BUY -> place_stock_order via Alpaca MCP (notional, type limit, limit_price, time_in_force day) then `node run.mjs opened <SYM> <fillPx> <fillQty> <arm>`; SELL -> close_position via MCP then `node run.mjs closed <SYM> <fillPx>`; HOLD -> nothing. If learnDue run the learnHint. Append one concise line to _state/SESSIONS.md (note any non-HOLD action). If a BUY/SELL is required but the Alpaca MCP trading tools are not loaded in this session, do NOT place the order — log skipped + report it. Finally, if clearDue is true, run /clear LAST (after everything else, even when market closed) to reset context.
```

Each tick Claude: (1) optional `get_account_info` → equity, then `node run.mjs tick …`; (2) if
`marketOpen:false` → log (no orders); (3) per plan item, BUY→`place_stock_order` then `opened`,
SELL→`close_position` then `closed`, HOLD→nothing; (4) if `learnDue` (≈hourly, RTH only) run the
hint; (5) append a line to `SESSIONS.md`; (6) **if `clearDue` is true** (every 20th tick ≈ 20 min)
run **`/clear`** as the last action to reset context — state lives in `_state/`, so nothing is lost
and the next `/loop` tick re-injects these instructions. **Unlike the crypto scalper, expect this one
to actually trade** once a breakout fires in an up-regime — the bandit has a positive-edge arm active.

**Position memory** lives in `_state/positions.json` (peak/bars-held recomputed each tick); a
position is always managed by the arm that opened it.

**Prereq:** the **Alpaca MCP** must be running for live order placement, AND the launching session
must have inherited `ALPACA_API_KEY`/`ALPACA_SECRET_KEY` (the data fetch needs them too). In sim
mode you can record fictive fills at the plan price instead of hitting the MCP.

## Guardrails & honest caveats

- **Long/flat only.** FLAT is a valid answer; the bandit returns to it if the edge decays.
- **The positive edge is real but thin and in-sample.** EW means are ~+0.0003–0.0009/bar on ~780
  IEX bars; not walk-forward validated. Treat as promising, not proven — let paper fills confirm it.
- **IEX partial feed** — keep the basket liquid; don't loosen the spread estimate or add thin names.
- **PDT rule**: live day-trading under $25k equity is restricted to 3 day-trades/5 days. Irrelevant
  at paper $100k; matters if you ever go live small.
- **Overnight gaps**: the engine spans the close→open gap as one bar — size stops with that in mind.
- SIMULATION/paper by default. State lives in `_state/` (`params.json`, `decisions.ndjson`,
  `outcomes.ndjson`, `positions.json`) — it is the memory; back it up, don't hand-edit mid-session.
