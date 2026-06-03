# Adaptive Scalper — session ledger (human-readable)

One line per learning pass or paper session. The machine state is in `params.json` /
`decisions.ndjson` / `outcomes.ndjson`; this file is the readable story for a human.

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
2026-06-03T17:41Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learn: leader A1 active A0 (all traders net-neg, FLAT held) | no orders
2026-06-03T17:47Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T17:52Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T17:57Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T18:01Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T18:17Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T18:18Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T18:22Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T18:27Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T18:32Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T18:37Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learn: leader A1 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-03T18:41Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T18:46Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T18:51Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T18:56Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T19:00Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T19:05Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T19:10Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T19:15Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T19:19Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T19:24Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T19:29Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T19:36Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learn: leader A1 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-03T19:40Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T19:52Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T19:56Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T20:01Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T20:11Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T20:16Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T20:20Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T20:25Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T20:30Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T20:35Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learn: leader A1 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-03T20:39Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T20:44Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T20:49Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T20:54Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T20:58Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T21:07Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T21:12Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T21:17Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
