# Adaptive Scalper — session ledger (human-readable)

One line per learning pass or paper session. The machine state is in `params.json` /
`decisions.ndjson` / `outcomes.ndjson`; this file is the readable story for a human.

2026-06-05T12:49:15Z | equity=100000 | arm=A0 | 12×HOLD (flat arm — no arm beats fee floor) | 0 orders

2026-06-05T12:48:08Z | equity=$100000 | arm=A0 (flat) | 12×HOLD — no arm beats fee floor on recent bars | 0 orders

2026-06-05T12:47:11Z | equity=$100000 | arm=A0 (flat) | all 12 HOLD — flat arm active, no arm clears fee floor on recent bars | no orders placed

2026-06-05T12:44:42Z | equity=$100000 | arm=A0 | all 12 HOLD (flat arm — no arm beats fee floor) | no orders

**Mode:** PAPER-account oriented, NOT yet wired to place orders. 5Min clock. Long/flat.
**Fee model:** 0.15% maker + 0.25% taker + ~0.08% spread ≈ **0.48% round-trip** → fee floor ~0.58%.
**Starting posture:** FLAT (arm A0). The bandit leaves cash only when a trading arm shows a
positive net-of-fee EW mean on recent real bars.

## Honest baseline (2026-06-03, build)
Measured on real Alpaca 5Min bars: every trading arm is net-negative even across two +50% bull
windows (over-trading vs the fee floor). Active arm = **A0 (FLAT)**. No edge proven yet — by design
the skill preserves capital until paper data earns a trader.

## Log
| UTC | pair / window | leader arm | active | changes | note |
|-----|---------------|-----------|--------|---------|------|
| 2026-06-03 (build) | BTC 14d | A1 | **A0 FLAT** | seed | all trading arms net-negative; cash is correct |
| 2026-06-03→05 | BTC+11 pairs | A1→A4→A3 rotations | **A0 FLAT** | ~1000 ticks archived | every tick all-HOLD, 0 orders — full detail in SESSIONS-archive-2026-06.md |
2026-06-05T12:3xZ | CLEANUP: /loop autopilot retired -> single entry point scripts/strategy.ps1 (1-min scheduled task, fresh headless session per tick). clearDue/loop_ticks removed. Charter gate live on all BUYs.

2026-06-05T12:24:09Z | equity=100000 | arm=A0 | decisions=12xHOLD | orders=0
2026-06-05T12:25Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=true(BTC,14d) | no orders
2026-06-05T12:26Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=true(BTC,14d) | no orders
2026-06-05T12:27:07Z | equity=100000 | arm=A0 | ticks=635 | all-HOLD (flat arm, no arm beats fee floor) | orders=none
2026-06-05T12:28:10Z | equity=100000 | arm=A0 | all 12 HOLD (flat arm, no arm beats fee floor) | 0 orders
| 2026-06-05T12:46:10Z | equity=100000 | arm=A0 | 12×HOLD (flat arm — no arm beats fee floor) | orders=none |
2026-06-05T13:23Z | learn(BTC,14d 1Min, 19846 bars): leader A6, active A0 FLAT held (all traders net-neg) | no structural change | 0 orders
2026-06-05T14:19Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held (all traders net-neg) | no structural change | 0 orders
2026-06-05T15:15Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held (all traders net-neg) | no structural change | 0 orders
2026-06-05T16:11Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held (all traders net-neg) | no structural change | 0 orders
2026-06-05T17:07Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held (all traders net-neg) | no structural change | 0 orders
2026-06-05T17:08Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held (all traders net-neg) | no structural change | 0 orders
2026-06-05T18:03Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held (all traders net-neg) | no structural change | 0 orders
2026-06-05T18:59Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held (all traders net-neg) | no structural change | 0 orders
2026-06-05T19:56Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-05T20:06Z | ERROR: crypto tick failed 2x (data.alpaca.markets connect timeout) — tick skipped; book FLAT, no positions at risk
2026-06-05T20:51Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T05:41Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T06:37Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T07:33Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T08:29Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T09:51Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders (note: ~27 ticks skipped 09:21-09:49, permission classifier outage; book FLAT throughout)
2026-06-06T10:27Z | ERROR: crypto tick failed 2x (data.alpaca.markets connect timeout) - tick skipped; book FLAT, no positions at risk
2026-06-06T10:47Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T11:43Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T12:13Z | ERROR: crypto tick failed 2x (data.alpaca.markets connect timeout) - tick skipped; book FLAT, no positions at risk
2026-06-06T12:39Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T12:40Z | ERROR: crypto tick failed 2x (data.alpaca.markets connect timeout) - tick skipped; book FLAT, no positions at risk
2026-06-06T13:35Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T14:31Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T15:28Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T15:35Z | ERROR: crypto+equity ticks failed (data.alpaca.markets connect timeout, crypto 2x) - tick skipped; book FLAT, no positions at risk
2026-06-06T16:24Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T16:37Z | ERROR: crypto tick failed 2x (data.alpaca.markets connect timeout) - tick skipped; book FLAT, no positions at risk
2026-06-06T17:12Z | ERROR: crypto 2x + equity 1x tick failed (data.alpaca.markets connect timeout) - tick skipped; book FLAT, no positions at risk
2026-06-06T17:20Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T18:04Z | ERROR: crypto 2x + equity 1x tick failed (data.alpaca.markets connect timeout) - tick skipped; book FLAT, no positions at risk
2026-06-06T18:16Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T19:22Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | daily momentum-2026 ran (late, due 13:18Z): 8/8 FLAT, target 100% cash, book already cash | 0 orders
2026-06-06T20:18Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T21:14Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T22:10Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-06T23:06Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-07T00:02Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-07T00:58Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-07T01:54Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-07T02:50Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
2026-06-07T03:46Z | learn(BTC,14d 1Min): leader A6, active A0 FLAT held | no structural change | 0 orders
- 2026-06-08T05:41Z learn BTC/USD 14d (19935 bars, 0 fills) → leader A8, active A0 FLAT, no structural change
- 2026-06-08T06:37Z learn BTC/USD 14d (19937 bars, 0 fills) → leader A8, active A0 FLAT, no structural change
- 2026-06-08T07:33Z learn BTC/USD 14d (19938 bars, 0 fills) → leader A8, active A0 FLAT, no structural change
- 2026-06-08T08:29Z learn BTC/USD 14d (19940 bars, 0 fills) → leader A8, active A0 FLAT, no structural change
- 2026-06-08T09:25Z learn BTC/USD 14d (19941 bars, 0 fills) → leader A8, active A0 FLAT, no structural change
- 2026-06-08T10:21Z learn BTC/USD 14d (19943 bars, 0 fills) → leader A8, active A0 FLAT, no structural change
- 2026-06-08T11:17Z learn BTC/USD 14d (19948 bars, 0 fills) → leader A8, active A0 FLAT, no structural change
- 2026-06-08T12:13Z learn BTC/USD 14d (19951 bars, 0 fills) → leader A8, active A0 FLAT, no structural change
- 2026-06-08T13:09Z learn BTC/USD 14d (19952 bars, 0 fills) → leader A8, active A0 FLAT, no structural change
- 2026-06-08T14:05Z learn BTC/USD 14d (19952 bars, 0 fills) → leader A8, active A0 FLAT, no structural change
- 2026-06-08T15:01Z learn BTC/USD 14d (19953 bars, 0 fills) → leader A8, active A0 FLAT, no structural change
- 2026-06-08T15:57Z learn BTC/USD 14d (19953 bars, 0 fills) → leader A8, active A0 FLAT, no structural change
- 2026-06-08T16:53Z learn BTC/USD 14d (19955 bars, 0 fills) → leader A8, active A0 FLAT, no structural change
- 2026-06-08T17:49Z learn BTC/USD 14d (19957 bars, 0 fills) → leader A8, active A0 FLAT, no structural change
- 2026-06-08T18:45Z learn BTC/USD 14d (19964 bars, 0 fills) → leader A8, active A0 FLAT, no structural change
- 2026-06-08T19:58Z learn BTC/USD 14d → leader A8, active A0 FLAT, no change
