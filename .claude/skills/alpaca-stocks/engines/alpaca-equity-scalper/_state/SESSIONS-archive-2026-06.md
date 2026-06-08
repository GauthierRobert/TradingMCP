# alpaca-equity-scalper — session ledger

One line per autopilot tick. Venue: US equities/ETFs (commission-free) via Alpaca paper.
Data: auth'd IEX 5Min bars. Market-hours gated — off-hours ticks are no-ops (data stale → all HOLD).
The bandit starts FLAT (A0) and only deploys a trading arm once a `learn` pass proves one clears
the ~0.08% spread-only cost floor on real bars. (Commission-free → ~7x lower floor than crypto.)

2026-06-04T18:58Z | BUILD: equity scalper forked from crypto engine. 12 instruments (SPY,QQQ,IWM,GLD,SLV,USO,TLT,AAPL,MSFT,NVDA,AMZN,META), IEX auth feed, commission-free (cost floor 0.08%). learn SPY/QQQ -> bandit LEFT FLAT, active=A4 (3-4 arms net-positive). Cron ed6ae850 every 5m (:02 offset).
2026-06-04T18:58Z | tick equity=100000 active=A4 marketOpen=true | 12 instruments ALL HOLD (A4 breakout-strict, no breakout firing) | no orders
2026-06-04T19:04Z | tick equity=100000 active=A4 marketOpen=true | 12 instruments ALL HOLD | learnDue=false | no orders
2026-06-04T19:09Z | tick equity=100000 active=A4 marketOpen=true | SPY BUY (breakout) notional=25000 qty=32.9815 @758 [SIMULATED fill - MCP tools not loaded] | other 11 HOLD | learnDue=false
2026-06-04T19:14Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY long @758 now 757.71 (2026-06-04T19:14Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY long entry=758 now=757.71 gain=-0.04pct (within stop/tp) | 11 others HOLD | no new orders
2026-06-04T19:19Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY long entry=758 now=757.68 gain=-0.04pct | 11 others HOLD | no new orders
2026-06-04T19:20Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY long entry=758 now=757.70 gain=-0.04pct | 11 others HOLD | no new orders
2026-06-04T19:21Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY long entry=758 now=757.80 gain=-0.03pct | 11 others HOLD | no new orders
2026-06-04T19:22Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY long entry=758 now=757.67 gain=-0.04pct | 11 others HOLD | no new orders
2026-06-04T19:23Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY long entry=758 now=757.90 gain=-0.01pct | 11 others HOLD | no new orders
2026-06-04T19:24Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY long entry=758 now=757.92 gain=-0.01pct | 11 others HOLD | no new orders
2026-06-04T19:25Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY long entry=758 now=757.98 gain=-0.00pct | 11 others HOLD | no new orders
2026-06-04T19:26Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY long entry=758 now=757.99 ~breakeven | 11 others HOLD | no new orders
2026-06-04T19:27Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY long entry=758 now=757.97 ~breakeven | 11 others HOLD | no new orders
2026-06-04T19:28Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY long entry=758 now=758.07 gain=+0.01pct (green) | 11 others HOLD | no new orders
2026-06-04T19:29Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY long entry=758 now=758.15 gain=+0.02pct | 11 others HOLD | no new orders
2026-06-04T19:30Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY long entry=758 now=758.29 gain=+0.04pct | 11 others HOLD | no new orders
2026-06-04T19:31Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY long entry=758 now=758.23 gain=+0.03pct | 11 others HOLD | no new orders
2026-06-04T19:32Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY long entry=758 now=758.16 gain=+0.02pct | 11 others HOLD | no new orders
2026-06-04T19:33Z | tick equity=100000 active=A4 marketOpen=true | IWM BUY (breakout) notional=25000 qty=85.4058 @292.72 [SIMULATED] | HOLD SPY +0.03pct | 10 others HOLD | now 2 positions (SPY,IWM) ~50pct deployed
2026-06-04T19:34Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY +0.03pct, IWM +0.01pct (both green) | 10 others HOLD | no new orders
2026-06-04T19:35Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY +0.02pct, IWM +0.01pct | 10 others HOLD | no new orders
2026-06-04T19:36Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY +0.02pct, IWM +0.03pct | 10 others HOLD | no new orders
2026-06-04T19:37Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY +0.03pct, IWM +0.03pct | 10 others HOLD | no new orders
2026-06-04T19:38Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY +0.01pct, IWM +0.03pct | 10 others HOLD | no new orders
2026-06-04T19:39Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY +0.01pct, IWM +0.03pct | 10 others HOLD | no new orders
2026-06-04T19:40Z | tick equity=100000 active=A4 marketOpen=true | SLV BUY (breakout) notional=25000 qty=373.023 @67.02 [SIMULATED] | HOLD SPY +0.02pct IWM +0.04pct | 9 others HOLD | now 3 positions (SPY,IWM,SLV) ~75pct deployed
2026-06-04T19:41Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY -0.01pct IWM -0.01pct SLV -0.01pct (3 pos, slight pullback) | 9 others HOLD | no new orders
2026-06-04T19:42Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY -0.01pct IWM -0.03pct SLV -0.01pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T19:43Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY -0.02pct IWM -0.04pct SLV +0.02pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T19:44Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY -0.02pct IWM -0.08pct SLV -0.02pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T19:45Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY -0.03pct IWM -0.10pct SLV -0.05pct (3 pos, mild drawdown) | 9 others HOLD | no new orders
2026-06-04T19:46Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY -0.04pct IWM -0.14pct SLV -0.03pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T19:47Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY -0.04pct IWM -0.14pct SLV -0.05pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T19:48Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY -0.04pct IWM -0.13pct SLV -0.05pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T19:49Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY -0.04pct IWM -0.13pct SLV -0.12pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T19:50Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY -0.02pct IWM -0.09pct SLV -0.10pct (3 pos, recovering) | 9 others HOLD | no new orders
2026-06-04T19:51Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY -0.06pct IWM -0.14pct SLV -0.10pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T19:52Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY -0.06pct IWM -0.14pct SLV -0.13pct (3 pos) | learn(SPY): leader A4 active A4 (no structural change) | 9 others HOLD | no new orders
2026-06-04T19:53Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY -0.07pct IWM -0.13pct SLV -0.11pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T19:54Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY -0.05pct IWM -0.13pct SLV -0.12pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T19:55Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY -0.06pct IWM -0.16pct SLV -0.13pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T19:56Z | tick equity=100000 active=A4 marketOpen=true | HOLD SPY -0.12pct IWM -0.25pct SLV -0.12pct (3 pos, IWM softening) | 9 others HOLD | no new orders
2026-06-04T19:57Z | tick equity=100000 active=A4 marketOpen=true | SPY SELL (exit) @757.07 net pnl=-0.15pct [SIMULATED, first closed round-trip, recorded for learning] | HOLD IWM -0.24pct SLV -0.13pct | now 2 positions
2026-06-04T19:58Z | tick equity=100000 active=A4 marketOpen=true | HOLD IWM -0.26pct SLV -0.08pct (2 pos) | 10 others HOLD | no new orders
2026-06-04T19:59Z | tick equity=100000 active=A4 marketOpen=true | GLD BUY (breakout) notional=25000 qty=60.7762 @411.345 [SIMULATED] | HOLD IWM -0.22pct SLV -0.03pct | 9 others HOLD | now 3 positions (IWM,SLV,GLD)
2026-06-04T20:00Z | tick equity=100000 active=A4 marketOpen=true | HOLD IWM -0.26pct GLD -0.02pct SLV -0.06pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T20:01Z | tick equity=100000 active=A4 marketOpen=true | HOLD IWM -0.26pct GLD -0.02pct SLV -0.06pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T20:02Z | tick equity=100000 active=A4 marketOpen=true | HOLD IWM -0.23pct GLD -0.02pct SLV -0.06pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T20:03Z | tick equity=100000 active=A4 marketOpen=true | HOLD IWM -0.24pct GLD -0.02pct SLV -0.06pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T20:04Z | tick equity=100000 active=A4 marketOpen=true | HOLD IWM -0.24pct GLD -0.02pct SLV -0.06pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T20:05Z | tick equity=100000 active=A4 marketOpen=true | HOLD IWM -0.24pct GLD -0.02pct SLV -0.06pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T20:06Z | tick equity=100000 active=A4 marketOpen=true | HOLD IWM -0.24pct GLD -0.02pct SLV -0.06pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T20:07Z | tick equity=100000 active=A4 marketOpen=true(extended-hrs) | HOLD IWM -0.24pct GLD -0.02pct SLV -0.06pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T20:08Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.24pct GLD -0.02pct SLV -0.06pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T20:09Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.30pct GLD -0.02pct SLV -0.06pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T20:10Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.30pct GLD -0.02pct SLV -0.06pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T20:11Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.30pct GLD -0.02pct SLV -0.06pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T20:12Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.30pct GLD -0.02pct SLV -0.06pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T20:13Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.30pct GLD -0.02pct SLV -0.06pct (3 pos) | 9 others HOLD | no new orders
2026-06-04T20:14Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.30pct GLD -0.02pct SLV -0.06pct (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:16Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.30pct GLD ~flat SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:16Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.30pct GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:17Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.30pct GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:18Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.30pct GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:19Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.30pct GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:20Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.30pct GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:21Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.30pct GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:22Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.30pct GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:23Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.30pct GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:24Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM -0.30pct GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:25Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:26Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:27Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:28Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:29Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:30Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:31Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:32Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:33Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:34Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:35Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:36Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:37Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:38Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:39Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:40Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:41Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:42Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM ~flat GLD -0.13pct SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:43Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM ~flat GLD -0.13pct SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:44Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM ~flat GLD -0.13pct SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:45Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM ~flat GLD -0.13pct SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:46Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM ~flat GLD -0.13pct SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:47Z | tick equity=100000 active=A4 marketOpen=true(ext-hrs) | HOLD IWM ~flat GLD -0.13pct SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:48Z | tick equity=100000 active=A4->A7 marketOpen=true(ext-hrs) | learn(SPY, 1 real fill): SELF-MODIFY bred A7 (ewMean +0.0007, 60pct win, +0.23pct) beating A2; active A4->A7 | HOLD IWM/GLD/SLV (3 SIMULATED pos, managed by A4) | no new orders
2026-06-04T20:49Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV (3 SIMULATED pos, managed by A4) | new entries now use A7 | 9 others HOLD | no new orders
2026-06-04T20:50Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM ~flat GLD -0.13pct SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:51Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM ~flat GLD -0.13pct SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:52Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM ~flat GLD -0.13pct SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:53Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM ~flat GLD -0.13pct SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:54Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM ~flat GLD -0.13pct SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:55Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM ~flat GLD -0.13pct SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:56Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM ~flat GLD -0.13pct SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:57Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM ~flat GLD -0.13pct SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:58Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM ~flat GLD -0.13pct SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T20:59Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM ~flat GLD -0.13pct SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T21:00Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T21:01Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T21:02Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T21:03Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T21:04Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T21:05Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T21:06Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T21:07Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T21:08Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T21:09Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T21:10Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T21:11Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T21:12Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T21:13Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T21:15Z | tick equity=100000 active=A7 marketOpen=true(ext-hrs) | HOLD IWM/GLD/SLV ~flat (3 SIMULATED pos) | 9 others HOLD | no new orders
2026-06-04T21:15Z | marketOpen=FALSE (data stale, after-hours liquidity dried up) — no action; 3 positions (IWM/GLD/SLV) held flat until RTH resumes
2026-06-04T21:16Z | marketOpen=FALSE — no action; 3 positions held flat until RTH
2026-06-04T21:17Z | marketOpen=FALSE — no action; 3 positions held flat until RTH
2026-06-05T05:49Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action (IWM/GLD/SLV held overnight)
2026-06-05T05:52Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T05:53Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T05:54Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T05:56Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T05:58Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:00Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:02Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:04Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:06Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:08Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:10Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:12Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:14Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:16Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:17Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action (1st attempt transient error, clean on retry)
2026-06-05T06:19Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:21Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:23Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:25Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:27Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:28Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:30Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:32Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:34Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:36Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:37Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:39Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:41Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:43Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:45Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:47Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:48Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:50Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:52Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:54Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:55Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:57Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T06:58Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:00Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:02Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:04Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:06Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:08Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:10Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:12Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:14Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:16Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:18Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:20Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:22Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:24Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:26Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:28Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:30Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:32Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:34Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:36Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:38Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:40Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:42Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:44Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:46Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:48Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:50Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:52Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:54Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:56Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:58Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T07:59Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:00Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:02Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:04Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:06Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:08Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:10Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:12Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:14Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:16Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:18Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:20Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:22Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:24Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:26Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:28Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:30Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:32Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:34Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:36Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:38Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:40Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:42Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:44Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:46Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:48Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:50Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:52Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:53Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:55Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:57Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T08:59Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:01Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:03Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:05Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:07Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:09Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:10Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:12Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:14Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:16Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:18Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:20Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:21Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:23Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:25Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:27Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:29Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:31Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:33Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:35Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:37Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:38Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:40Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:42Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:44Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:45Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:47Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:48Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:49Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:50Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:52Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:54Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:55Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:56Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:57Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:58Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T09:59Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:01Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:02Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:03Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:05Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:07Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:08Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:09Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:10Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:11Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:12Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:14Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:15Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:17Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:18Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:19Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:20Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:22Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:23Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:25Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:26Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:27Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:29Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:30Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:31Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:32Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:34Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:35Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:37Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:39Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:40Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:42Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:44Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:45Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:47Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:48Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:50Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:51Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:53Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:54Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:56Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:57Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T10:59Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:00Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:02Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:03Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:05Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:06Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:08Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:09Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:11Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:12Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:14Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:15Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:17Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:18Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:20Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:21Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:22Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:23Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:25Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:26Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:28Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:29Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:31Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:32Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:34Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:36Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:38Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:39Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:41Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:42Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:44Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:45Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:47Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:48Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:50Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:51Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:53Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:54Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:56Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:57Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:59Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T12:01Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T12:02Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T12:04Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T12:06Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T12:07Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T12:09Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T12:10Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T12:12Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T12:13Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T12:14Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T12:16Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T12:17Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T12:19Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T12:20Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T12:22Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T12:23Z | tick equity=100000 active=A7 | marketOpen=false — market closed, no action
2026-06-05T11:51Z | tick equity=100000 | market closed — no action [1m-loop]
2026-06-05T12:05Z | tick equity=100000 | market closed — no action [1m-loop]
