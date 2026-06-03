---
name: bear-market-edge-findings
description: Out-of-sample finding on whether long/flat spot can make money in bear markets (the spot-trade-decision skill)
metadata:
  type: project
---

Researched (2026-06-03) whether you can profit in BEAR markets on long/flat spot by
dip-buying small variations on 15m/1h (user's question). Built `sim/engine2.mjs`
(mean-reversion/range families: mr_z, rsi, bb, donch + risk controls) and ran a parallel
multi-agent tuning sweep, then validated on 8 fresh OOS crash windows (2021 crash, FTX,
SOL top, DOGE, BNB22) never used in tuning.

**Conclusion: you cannot reliably BEAT CASH in a bear on long/flat spot.** Beating
buy-and-hold is trivial and not the goal. The robust config — RSI reversal-buy with an
EMA-reclaim entry confirmation (`{entryConfirm:'emaReclaim', families:['rsi']}`) — gives:
in-sample bear +$1,490 / 0-of-8 hurt, but **OOS −$529 vsCash (≈ breakeven) while +$24,633
vsBH**. It makes money on crash→bounce windows (FTX ETH +13%, DOGE +4.8%) and loses on
vertical capitulations (May-2021 BTC −10%, ETH −12%). On all 1h slow bears it correctly
sits FLAT (=cash).

**Every added filter overfit:** free-fall gate (declMax), tighter stops, take-profit,
selector edgeMargin/maxHold all improved TRAINING but made OOS *worse* (e.g. gate10w480:
train +1,883 → OOS −1,596). The `trend` family is catastrophic in bear (−$19k standalone) —
it rides knives down; the baseline bear loss was entirely trend.

**Why:** no causal filter reliably distinguishes a relief-rally setup from a falling knife
ex-ante — that's the core difficulty. So: beat B&H massively + ≈ match cash + occasionally
catch a bounce is the realistic OOS ceiling, NOT systematic bear profit. See [[spot-trade-decision]]
skill (updated with this evidence). Tooling: `sim/engine2.mjs`, `sim/validate2.mjs`,
`sim/oos.mjs`, `sim/compare.mjs`, `sim/fetch.mjs`.
