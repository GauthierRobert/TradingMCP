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
