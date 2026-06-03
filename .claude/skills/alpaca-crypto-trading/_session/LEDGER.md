# Alpaca Paper-Trading Session — Live Ledger

**Mode:** PAPER (account PA3SNOAKWFCI, ALPACA_PAPER_TRADE=true). Long/flat spot only.
**Started:** 2026-06-03 ~10:15 UTC. Starting equity: **$100,000** cash.
**Fee model:** Alpaca base tier (crypto_tier 0) ≈ 0.25% taker/fill → ~0.50% round-trip.
**Primary clock:** 1Hour bars, `fee=0.0025, lambda=0.007` (re-validated on Alpaca 60d). Size ~$10k/position.
**Scout clock (added iter 5):** 15Min bars. Engine validated → FLAT at all λ (loses to cash net of fees), so scout trades ONLY on the discretionary **bounce module** (RSI cross↑30 + EMA12 reclaim). Size ~$5k/position.
**Watchlist:** BTC/USD, ETH/USD, SOL/USD. (SOL deprioritized for scouting — spread ~0.36% → ~0.86% round-trip.)
**Live spreads (2026-06-03 12:15Z):** BTC ~0.08%, ETH ~0.08%, SOL ~0.36%. True round-trip = 2·0.25% + spread.

## Re-validation result (60d, 1h, fee 0.0025) — done 2026-06-03
- BTC: window dead-flat (oracle +0.10%) → no edge; all λ lose to cash. Best λ=0.007 (−0.52%).
- ETH: B&H −8.2%; engine λ=0.007 = **+3.77%** (beats cash +$377, beats B&H +$1239). Best symbol.
- SOL: B&H −6.25%; engine loses modestly at low λ, goes FLAT (0%, beats B&H +$662) at λ≥0.010.
- **Chosen λ=0.007** (beats cash on ETH; worst case −2.1%; none badly hurt).

## Current positions
| Symbol | Side | Qty | Entry $ | Notional | Status |
|--------|------|-----|---------|----------|--------|
| — | FLAT | — | — | — | all cash |

## Paper P&L
- Realized: $0.00 | Fees paid: $0.00 | Open unrealized: $0.00 | Trades: 0
- Equity: $100,000.00 (100.00% of start) | vs all-cash: 0.00%
- vs equal-wt buy&hold since start (10:00Z entries BTC 67116/ETH 1880.5/SOL 75.14): B&H ≈ **−0.31%** as of 13:00Z → **flat is +0.31% ahead** (dodged the continued drift down).

## Decision log
| UTC time | Symbol | Decision | Regime | Why |
|----------|--------|----------|--------|-----|
| 2026-06-03 10:15 | ALL | **HOLD / FLAT** | "bull" (lagging) | Post-capitulation relief rally: 24h returns negative (BTC −3.5%, ETH −5.1%, SOL −5.3%), price mid-band (~40%, no breakout), engine selects FLAT on all. No edge clears ~0.50% round-trip. Cash IS the position. |
| 2026-06-03 ~12:42 | ALL | **HOLD / FLAT** | "bull" (lagging) | Re-check #2. 1h bar unchanged (still 10:00Z); prices flat. Engine FLAT all 3, bounce no-entry (RSI 42–50, no cross↑30), 24h still neg. No change. |
| 2026-06-03 ~13:13 | ALL | **HOLD / FLAT** | **chop** (bull rolled off) | Re-check #3. New bar 11:00Z. Regime flipped bull→chop as bounce stalled (1h/6h flat-to-neg) — confirms not buying the lagging-bull label. Engine still FLAT all 3, bounce no-entry (RSI 44–49). 24h still neg. |
| 2026-06-03 ~13:44 | ALL | **HOLD / FLAT** | chop | Re-check #4. Bar still 11:00Z (feed lag); prices drifted −0.1/−0.2%. Engine FLAT, bounce no-entry (RSI 44–48). No change → widening cadence to 45m. |
| 2026-06-03 ~14:30 | ALL | **HOLD / FLAT** (both clocks) | chop | Re-check #5 + algo adapt. Added 15Min scout clock (validated: engine flat/loses to cash net of fees → scout = bounce-module only). Prices now sliding DOWN (12:15Z): BTC 66.9k, ETH 1867, SOL 74.6; ret1h −0.55/−0.66/−1.18%, posInBand 34–38%, RSI FALLING toward oversold (ETH 38.6, SOL 43.7) — renewed leg down, not a turn. No entry on either clock. Tightening cadence to 15m (setup forming on ETH). |
| 2026-06-03 ~14:33 | ALL | **HOLD / FLAT** (both clocks) | chop | Re-check #6. New 1h bar 12:00Z. 1h engine FLAT all 3 (last actions historical SELLs). 15m dip recovered WITHOUT reaching oversold — RSI bounced off mid-40s (BTC 55/ETH 47/SOL 53), no cross↑30, price still <EMA12 → bounce module never armed. Prices ticked up slightly. Cash +0.25% vs B&H. Setup eased → cadence back to 30m. |
| 2026-06-03 ~15:05 | ALL | **HOLD / FLAT** (3 strategies) | **bear-chop** (BTC/ETH) | Re-check #7, now incl. FARS. New 1h bar 13:00Z. UNANIMOUS flat: 1h engine FLAT all 3 (BTC/ETH regime→bear-chop); FARS HOLD BTC&ETH (macro gate SHUT — price ~7–8% below slow EMA240: BTC 66.9k vs 72.8k, ETH 1872 vs 2011); 15m bounce no-entry (RSI rose to 52–60, never oversold). Confirmed downtrend = cash. Cash +0.31% vs B&H. Cadence 30m. |

## Algorithm evolution — FARS added & validated (2026-06-03, iter 7)
New strategy: **FARS** (Fee-Aware Reversion Scalper) in `engine.mjs` (`farsSignal` + `FARS_CFG`),
backtested in `_session/lab.mjs`. The user's "must-act / take-profit once gain > 2× fee" idea, made
**regime-gated**. Locked fixed config (do NOT per-window fit): dip 1% below EMA24 + RSI<35 entry,
gate = slow EMA(240) rising & price above it, TP +3% (clears 2× round-trip), stop −2%, 48-bar timeout.
- **Validated (Alpaca 1h):** ETH +8.7%/+6.9% vs cash (120/180d), BTC +7.2%/+6.5%; both go FLAT in
  held-out downtrends (no bleed). **SOL excluded** (loses everywhere — wide spread + downtrend).
- **Proven failure modes (kept as guardrails):** unconditional must-act loses to cash on 2/3 pairs
  (ETH naive "win" = +$281 net on $1,428 fees); per-window fitting overfits (train +23.9% → OOS −10.5%).
- **Live now:** `node harness.mjs fars "ETH/USD" 30 1Hour 60`. As of 12:00Z run: ETH & BTC gate SHUT
  (price below slow EMA 2011/72810) → HOLD/FLAT. Agrees with discretionary FLAT — but now rule-driven.

## Notes / rules being followed
- Only place a paper order when a real signal clears edge > 2·fee + spread (~0.50%+).
- "bull" label alone is NOT a buy — require breakout confirmation + move holding (skill's lagging-bull warning).
- Re-check each loop iteration; flatten any open long on a confirmed trend break / capitulation.
