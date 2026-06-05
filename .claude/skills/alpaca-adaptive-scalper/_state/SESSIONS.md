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
2026-06-03T21:21Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T21:26Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T21:31Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learn: leader A1 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-03T21:36Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T21:40Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T21:45Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T21:50Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T21:55Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T21:59Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T22:04Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T22:09Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T22:14Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T22:18Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T22:23Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T22:28Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learn: leader A1 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-03T22:33Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T22:37Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T22:42Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T22:47Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T22:52Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T22:56Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T23:01Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T23:06Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T23:11Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T23:15Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T23:20Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T23:25Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learn: leader A1 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-03T23:30Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T23:34Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T23:39Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T23:44Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T23:49Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T23:53Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-03T23:58Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T00:03Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T00:08Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T00:13Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T00:17Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T00:22Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learn: leader A1 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T00:27Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T00:32Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T00:36Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T00:41Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T00:46Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T00:51Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T00:55Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T01:00Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T01:05Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T01:10Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T01:14Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T01:19Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learn: leader A1 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T01:24Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T01:29Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T01:33Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T01:38Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T01:43Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T01:48Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T01:52Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T01:57Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T02:02Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T02:07Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T02:12Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T02:16Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learn: leader A1 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T02:21Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T02:26Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T02:31Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T02:35Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T02:40Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T02:45Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T02:50Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T02:54Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T02:59Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T03:04Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T03:09Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T03:13Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learn: leader A1 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T03:18Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T03:23Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T03:28Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T03:32Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T03:37Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T03:42Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T03:47Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T03:51Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T03:56Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T04:01Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T04:06Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T04:10Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learn: leader A1 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T04:15Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T04:20Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T04:25Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T04:29Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T04:35Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T04:39Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T04:44Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T04:49Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T04:53Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T04:58Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T05:03Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T05:08Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learn: leader A4 (now beats A1) active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T05:12Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T05:17Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T05:22Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T05:27Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T05:31Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T05:36Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T05:41Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T05:46Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T05:50Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T05:55Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T06:00Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T06:05Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learn: leader A4 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T06:09Z | tick equity=100000 active=A0 | BTC HOLD ETH HOLD | learnDue=false | no orders
2026-06-04T06:11Z | CONFIG CHANGE: expanded scan/tick universe from BTC,ETH -> 12 liquid majors (BTC,ETH,SOL,AVAX,LINK,LTC,BCH,DOGE,DOT,XRP,AAVE,UNI). Live cron swapped 2511eb91 -> ea85e887. All 4 scalper skills (alpaca/binance x adaptive/aggressive) defaults updated. 12-pair tick = 1.9s.
2026-06-04T06:22Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T06:27Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T06:32Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T06:36Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T06:41Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T06:46Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T06:51Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T06:56Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T07:00Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC): leader A4 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T07:05Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T07:10Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T07:15Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T07:19Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T07:24Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T07:29Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T07:34Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T07:38Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T07:43Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T07:48Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T07:53Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T07:57Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC): leader A4 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T08:02Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T08:07Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T08:12Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T08:16Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T08:21Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T08:26Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T08:31Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T08:35Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T08:40Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T08:45Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T08:50Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T08:54Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC): leader A4 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T08:59Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T09:04Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T09:09Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T09:14Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T09:18Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T09:23Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T09:28Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T09:33Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T09:37Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T09:42Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T09:47Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T09:52Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC): leader A4 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T09:56Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T10:01Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T10:06Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T10:11Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T10:15Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T10:20Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T10:25Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T10:30Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T10:35Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T10:39Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T10:44Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T10:49Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC): leader A4 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T10:54Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T10:58Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T11:03Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T11:08Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T11:13Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T11:17Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T11:22Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T11:27Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T11:32Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T11:36Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T11:41Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T11:46Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC): leader A4 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T11:51Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T11:55Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T12:00Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T12:05Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T12:10Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T12:14Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T12:19Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T12:24Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T12:29Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T12:33Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T12:38Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T12:43Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC): leader A4 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T12:48Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T12:53Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T12:57Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T13:02Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T13:07Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T13:12Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T13:16Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T13:21Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T13:26Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T13:31Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T13:35Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T13:40Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC): leader A4 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T13:45Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T13:50Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T13:54Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T13:59Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T14:04Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T14:09Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T14:13Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T14:18Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T14:23Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T14:28Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T14:33Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T14:37Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC): leader A4 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T14:42Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T14:47Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T14:52Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T14:56Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T15:01Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T15:06Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T15:11Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T15:15Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T15:20Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T15:25Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T15:30Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T15:34Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC): leader A3 (rotated from A4) active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T15:39Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T15:44Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T15:49Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T15:53Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T15:58Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T16:03Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T16:08Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T16:12Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T16:17Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T16:22Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T16:27Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T16:32Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC): leader A3 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T16:36Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T16:41Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T16:46Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T16:51Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T16:55Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T17:00Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T17:05Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T17:10Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T17:14Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T17:19Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T17:24Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T17:29Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC): leader A3 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T17:33Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T17:38Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T17:43Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T17:48Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T17:52Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T17:57Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T18:02Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T18:07Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T18:11Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T18:16Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T18:21Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T18:26Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC): leader A3 active A0 (all traders net-neg, FLAT held) | no structural change | no orders
2026-06-04T18:31Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T18:59Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:05Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:10Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:15Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:19Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:20Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:21Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:22Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC): leader A3 active A0 (all traders net-neg, FLAT held) | no orders
2026-06-04T19:23Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:24Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:25Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:26Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:27Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:28Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:29Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:30Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:31Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:32Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:33Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:34Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:35Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:36Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:37Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:38Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:39Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:40Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:41Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:42Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:43Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:44Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:45Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:46Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:47Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:48Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:49Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:50Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:51Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:52Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:53Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:54Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:55Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:56Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:57Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:58Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T19:59Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:00Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:01Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:02Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:03Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:04Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:05Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:06Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:07Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:08Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:09Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:10Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:11Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:12Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:13Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:14Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:15Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:16Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:17Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:18Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC): leader A3 active A0 (all traders net-neg, FLAT held) | no orders
2026-06-04T20:19Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:20Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:21Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:22Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:23Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:24Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:25Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:26Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:27Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:28Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:29Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:30Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:31Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:32Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:33Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:34Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:35Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:36Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:37Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:38Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:39Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:40Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:41Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:42Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:43Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:44Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:45Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:46Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:47Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:48Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:49Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:50Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:51Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:52Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:53Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:54Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:55Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:56Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:57Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:58Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T20:59Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:00Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:01Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:02Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:03Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:04Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:05Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:06Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:07Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:08Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:09Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:10Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:11Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:12Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:13Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:14Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC): leader A7 active A0 (all traders net-neg, FLAT held) | no orders
2026-06-04T21:15Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:16Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:17Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-04T21:18Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T05:48Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC,14d/4032 bars): leader A7 active A0 (all traders net-neg, FLAT held, no structural change) | no orders
2026-06-05T05:49Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T05:50Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T05:51Z | tick#1 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T05:53Z | tick#2 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T05:54Z | tick#3 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T05:55Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T05:56Z | tick#4 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T05:57Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T05:58Z | tick#5 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T05:59Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:00Z | tick#6 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:01Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:02Z | tick#7 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:03Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:04Z | tick#8 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:05Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:06Z | tick#9 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:07Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:08Z | tick#10 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:09Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:10Z | tick#11 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:11Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:12Z | tick#12 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:13Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:14Z | tick#13 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:15Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders (1st attempt hit transient fetch error, clean on retry)
2026-06-05T06:16Z | tick#14 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:17Z | tick#15 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:18Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:19Z | tick#16 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:20Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:21Z | tick#17 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:22Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:23Z | tick#18 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:24Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:25Z | tick#19 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:26Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:27Z | tick#20 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop] | COMPACTION DUE (tick#20 boundary)
2026-06-05T06:28Z | tick#21 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:29Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:30Z | tick#22 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:31Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:32Z | tick#23 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:33Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:34Z | tick#24 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:35Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:36Z | tick#25 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:37Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:37Z | tick#26 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:38Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:39Z | tick#27 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:40Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:41Z | tick#28 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:42Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:43Z | tick#29 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:44Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:45Z | tick#30 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:46Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:47Z | tick#31 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:48Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:48Z | tick#32 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:49Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:50Z | tick#33 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:51Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:52Z | tick#34 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:53Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:54Z | tick#35 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:55Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:55Z | tick#36 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:56Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:57Z | tick#37 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:58Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T06:58Z | tick#38 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T06:59Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:00Z | tick#39 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:01Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:02Z | tick#40 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop] | COMPACTION DUE (tick#40 boundary)
2026-06-05T07:03Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:04Z | tick#41 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:05Z | tick#42 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:07Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:08Z | tick#43 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:09Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:10Z | tick#44 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:11Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:12Z | tick#45 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:13Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:14Z | tick#46 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:15Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:16Z | tick#47 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:17Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:18Z | tick#48 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:19Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:20Z | tick#49 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:21Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC,14d/4032 bars): leader A7 active A0 (all traders net-neg, FLAT held, no structural change) | no orders
2026-06-05T07:22Z | tick#50 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:23Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:24Z | tick#51 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:25Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:26Z | tick#52 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:27Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:28Z | tick#53 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:29Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:30Z | tick#54 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:31Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:32Z | tick#55 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:33Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:34Z | tick#56 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:35Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:36Z | tick#57 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:37Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:38Z | tick#58 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:39Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:40Z | tick#59 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:41Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:42Z | tick#60 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop] | COMPACTION DUE (tick#60 boundary)
2026-06-05T07:43Z | tick#61 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:45Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:46Z | tick#62 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:47Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:48Z | tick#63 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:49Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:50Z | tick#64 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:51Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:52Z | tick#65 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:53Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:54Z | tick#66 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:55Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:56Z | tick#67 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:57Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T07:58Z | tick#68 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T07:59Z | tick#69 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:00Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:00Z | tick#70 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:01Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:02Z | tick#71 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:03Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:04Z | tick#72 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:05Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:06Z | tick#73 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:07Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:08Z | tick#74 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:09Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:10Z | tick#75 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:11Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:12Z | tick#76 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:13Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:14Z | tick#77 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:15Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:16Z | tick#78 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:17Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:18Z | tick#79 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:19Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:20Z | tick#80 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop] | COMPACTION DUE (tick#80 boundary)
2026-06-05T08:21Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:22Z | tick#81 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:23Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:24Z | tick#82 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:25Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:26Z | tick#83 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:27Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:28Z | tick#84 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:29Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:30Z | tick#85 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:31Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:32Z | tick#86 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:33Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:34Z | tick#87 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:35Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:36Z | tick#88 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:37Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:38Z | tick#89 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:39Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:40Z | tick#90 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:41Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:42Z | tick#91 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:43Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:44Z | tick#92 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:45Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:46Z | tick#93 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:47Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:48Z | tick#94 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:49Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:50Z | tick#95 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:51Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:52Z | tick#98 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:53Z | tick#100 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:54Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:55Z | tick#103 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:56Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:57Z | tick#106 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T08:58Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T08:59Z | tick#109 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:00Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:01Z | tick#112 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:02Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:03Z | tick#115 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:04Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:05Z | tick#118 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:06Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:07Z | tick#121 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:08Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:09Z | tick#124 equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC,14d/19845 1Min bars): leader A3 active A0 (all traders net-neg, worse at 1-min cadence, FLAT held, no structural change) | no orders [1m-loop]
2026-06-05T09:10Z | tick#126 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:11Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:12Z | tick#129 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:13Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:14Z | tick#132 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:15Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:16Z | tick#135 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:17Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:18Z | tick#138 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:19Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:20Z | tick#141 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:21Z | tick#143 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:22Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:23Z | tick#146 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:24Z | tick#148 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:26Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:27Z | tick#151 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:28Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:29Z | tick#154 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:30Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:31Z | tick#157 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:32Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:33Z | tick#160 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop] | COMPACTION DUE
2026-06-05T09:34Z | tick#162 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:36Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:37Z | tick#165 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:38Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:38Z | tick#168 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:39Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:40Z | tick#171 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:41Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:42Z | tick#174 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:43Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:44Z | tick#177 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:45Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:45Z | tick#180 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop] | COMPACTION DUE
2026-06-05T09:46Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:47Z | tick#183 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:48Z | tick#185 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:50Z | tick#187 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:51Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:52Z | tick#190 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:53Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:54Z | tick#193 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:55Z | tick#195 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:57Z | tick#197 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:59Z | tick#199 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:00Z | tick#201 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:01Z | tick#203 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:02Z | tick#205 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:04Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T10:05Z | tick#208 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:06Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T10:07Z | tick#211 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:08Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T10:08Z | tick#214 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:09Z | tick#216 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:11Z | tick#218 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:13Z | tick#220 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop] | COMPACTION DUE
2026-06-05T10:14Z | tick#222 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:15Z | tick#224 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:16Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T10:17Z | tick#227 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:18Z | tick#229 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:20Z | tick#231 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:21Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T10:22Z | tick#234 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:23Z | tick#236 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:24Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T10:25Z | tick#239 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:26Z | tick#241 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:27Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T10:27Z | tick#244 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:28Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T10:29Z | tick#247 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:30Z | tick#249 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:32Z | tick#251 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:33Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T10:34Z | tick#254 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:35Z | tick#256 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:36Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T10:37Z | tick#259 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:38Z | tick#261 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:39Z | tick#263 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:40Z | tick#265 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:41Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T10:42Z | tick#268 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:43Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T10:44Z | tick#271 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:45Z | tick#273 equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC,14d/19845 1Min): leader A3 active A0 (all traders net-neg, FLAT held, no structural change) | no orders [1m-loop]
2026-06-05T10:46Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T10:47Z | tick#276 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:48Z | tick#278 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:49Z | tick#280 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop] | COMPACTION DUE
2026-06-05T10:50Z | tick#282 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:51Z | tick#284 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:52Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T10:53Z | tick#287 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:54Z | tick#289 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:55Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T10:56Z | tick#292 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:57Z | tick#294 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:58Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T10:59Z | tick#297 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:00Z | tick#299 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:01Z | tick#301 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:02Z | tick#303 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:03Z | tick#305 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:04Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:05Z | tick#308 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:06Z | tick#310 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:07Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:08Z | tick#313 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:09Z | tick#315 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:10Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:11Z | tick#318 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:12Z | tick#320 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop] | COMPACTION DUE
2026-06-05T11:13Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:14Z | tick#323 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:15Z | tick#325 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:16Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:17Z | tick#328 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:18Z | tick#330 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:19Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:20Z | tick#333 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:21Z | tick#335 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:23Z | tick#337 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:24Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:25Z | tick#340 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop] | COMPACTION DUE
2026-06-05T11:26Z | tick#342 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:27Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:28Z | tick#345 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:29Z | tick#347 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:30Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:31Z | tick#350 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:32Z | tick#352 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:33Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:34Z | tick#355 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:35Z | tick#357 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:37Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:38Z | tick#360 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop] | COMPACTION DUE
2026-06-05T11:39Z | tick#362 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:40Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:41Z | tick#365 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:42Z | tick#367 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:43Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:44Z | tick#370 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:45Z | tick#372 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:46Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:47Z | tick#375 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:48Z | tick#377 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:49Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:50Z | tick#380 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop] | COMPACTION DUE
2026-06-05T11:51Z | tick#382 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:52Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:53Z | tick#385 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:54Z | tick#387 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:55Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:56Z | tick#390 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:57Z | tick#392 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:58Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T11:59Z | tick#395 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:00Z | tick#397 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:02Z | tick#399 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:03Z | tick#401 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:05Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T12:06Z | tick#404 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:07Z | tick#406 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:08Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T12:09Z | tick#409 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:10Z | tick#411 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:11Z | tick#413 equity=100000 active=A0 | 12 pairs ALL HOLD | learn(BTC,14d): leader A3 active A0 (all traders net-neg, FLAT held, no structural change) | no orders [1m-loop]
2026-06-05T12:12Z | tick#415 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:13Z | tick#417 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:14Z | tick#419 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:15Z | tick#421 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:16Z | tick#423 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:17Z | tick#425 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:18Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T12:19Z | tick#428 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:20Z | tick#430 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:21Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T12:22Z | tick#433 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:23Z | tick#435 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:24Z | tick equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders
2026-06-05T09:47Z | tick#438 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:48Z | tick#439 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:49Z | tick#440 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders | clearDue=true [1m-loop]
2026-06-05T09:50Z | tick#441 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:51Z | tick#442 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:52Z | tick#443 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:53Z | tick#444 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:54Z | tick#445 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:55Z | tick#446 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:56Z | tick#447 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:57Z | tick#448 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:58Z | tick#449 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T09:59Z | tick#450 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:00Z | tick#451 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:01Z | tick#452 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:02Z | tick#453 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:03Z | tick#454 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:04Z | tick#455 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:05Z | tick#456 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:06Z | tick#457 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:07Z | tick#458 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:08Z | tick#459 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:09Z | tick#460 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders | clearDue=true [1m-loop]
2026-06-05T10:10Z | tick#461 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:11Z | tick#462 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:12Z | tick#463 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:13Z | tick#464 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:14Z | tick#465 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:15Z | tick#466 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:16Z | tick#467 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:17Z | tick#468 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:18Z | tick#469 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:19Z | tick#470 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:20Z | tick#471 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:21Z | tick#472 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:22Z | tick#473 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:23Z | tick#474 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:24Z | tick#475 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:25Z | tick#476 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:26Z | tick#477 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:27Z | tick#478 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:28Z | tick#479 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:29Z | tick#480 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders | clearDue=true [1m-loop]
2026-06-05T10:30Z | tick#481 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:31Z | tick#482 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:32Z | tick#483 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:33Z | tick#484 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:34Z | tick#485 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:35Z | tick#486 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:36Z | tick#487 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:37Z | tick#488 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:38Z | tick#489 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:39Z | tick#490 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:40Z | tick#491 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:41Z | tick#492 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:42Z | tick#493 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:43Z | tick#494 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:44Z | tick#495 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:45Z | tick#496 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:46Z | tick#497 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:47Z | tick#498 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:48Z | tick#499 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:49Z | tick#500 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders | clearDue=true [1m-loop]
2026-06-05T10:50Z | tick#501 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:51Z | tick#502 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:52Z | tick#503 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:53Z | tick#504 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:54Z | tick#505 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:55Z | tick#506 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:56Z | tick#507 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:57Z | tick#508 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:58Z | tick#509 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T10:59Z | tick#510 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:00Z | tick#511 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:01Z | tick#512 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:02Z | tick#513 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:03Z | tick#514 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=true -> ran learn BTC/USD 14d (19845 bars, 0 fills): leader A7 ewMean -0.0048, all arms negative -> FLAT A0 retained, no structural change | no orders [1m-loop]
2026-06-05T11:04Z | tick#515 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:05Z | tick#516 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:06Z | tick#517 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:07Z | tick#518 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:08Z | tick#519 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:09Z | tick#520 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders | clearDue=true [1m-loop]
2026-06-05T11:10Z | tick#521 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:11Z | tick#522 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:12Z | tick#523 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:13Z | tick#524 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:14Z | tick#525 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:15Z | tick#526 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:16Z | tick#527 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:17Z | tick#528 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:18Z | tick#529 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:19Z | tick#530 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:20Z | tick#531 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:21Z | tick#532 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:22Z | tick#533 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:23Z | tick#534 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:24Z | tick#535 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:25Z | tick#536 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:26Z | tick#537 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:27Z | tick#538 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:28Z | tick#539 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:29Z | tick#540 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders | clearDue=true [1m-loop]
2026-06-05T11:30Z | tick#541 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:31Z | tick#542 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:32Z | tick#543 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:33Z | tick#544 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:34Z | tick#545 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:35Z | tick#546 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:36Z | tick#547 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:37Z | tick#548 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:38Z | tick#549 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:39Z | tick#550 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:40Z | tick#551 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:41Z | tick#552 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:42Z | tick#553 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:43Z | tick#554 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:44Z | tick#555 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:45Z | tick#556 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:46Z | tick#557 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:47Z | tick#558 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:48Z | tick#559 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:49Z | tick#560 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders | clearDue=true [1m-loop]
2026-06-05T11:50Z | tick#561 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:51Z | tick#562 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:52Z | tick#563 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:53Z | tick#564 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:54Z | tick#565 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:55Z | tick#566 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:56Z | tick#567 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:57Z | tick#568 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:58Z | tick#569 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T11:59Z | tick#570 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:00Z | tick#571 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:01Z | tick#572 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
2026-06-05T12:02Z | tick#573 equity=100000 active=A0 | 12 pairs ALL HOLD | learnDue=false | no orders [1m-loop]
