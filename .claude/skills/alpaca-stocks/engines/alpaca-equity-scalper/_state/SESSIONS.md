# alpaca-equity-scalper — session ledger

One line per autopilot tick. Venue: US equities/ETFs (commission-free) via Alpaca paper.
Data: auth'd IEX 5Min bars. Market-hours gated — off-hours ticks are no-ops (data stale → all HOLD).
The bandit starts FLAT (A0) and only deploys a trading arm once a `learn` pass proves one clears
the ~0.08% spread-only cost floor on real bars. (Commission-free → ~7x lower floor than crypto.)

2026-06-04T18:58Z | BUILD: equity scalper forked from crypto engine. 12 instruments (SPY,QQQ,IWM,GLD,SLV,USO,TLT,AAPL,MSFT,NVDA,AMZN,META), IEX auth feed, commission-free (cost floor 0.08%). learn SPY/QQQ -> bandit LEFT FLAT, active=A4 (3-4 arms net-positive). Cron ed6ae850 every 5m (:02 offset).
2026-06-04→05 | ~350 ticks archived (SPY/IWM/SLV/GLD trades, A4->A7 self-modify on first real fill, overnight market-closed no-ops) — full detail in SESSIONS-archive-2026-06.md
2026-06-04T19:57Z | tick equity=100000 active=A4 marketOpen=true | SPY SELL (exit) @757.07 net pnl=-0.15pct [SIMULATED, first closed round-trip, recorded for learning] | HOLD IWM -0.24pct SLV -0.13pct | now 2 positions
2026-06-04T20:48Z | tick equity=100000 active=A4->A7 marketOpen=true(ext-hrs) | learn(SPY, 1 real fill): SELF-MODIFY bred A7 (ewMean +0.0007, 60pct win, +0.23pct) beating A2; active A4->A7 | HOLD IWM/GLD/SLV (3 SIMULATED pos, managed by A4) | no new orders
2026-06-05T12:3xZ | CLEANUP: /loop autopilot retired -> single entry point scripts/strategy.ps1 (1-min scheduled task). Market-closed ticks no longer logged. Charter gate live on all BUYs.
2026-06-05T13:17Z | learn(SPY,14d 1Min): A7 ewMean turned -0.0001 (38 trades, 47% win) -> bandit DEMOTED active A7->A0 FLAT. All arms net-negative on 1Min — equity 1-min edge unproven, back to cash. | loop-1m first pass: crypto 12 HOLD (A0), equity 12 HOLD (3 sim pos held), trio=DOWN->cash, daily=100% CASH
2026-06-05T13:31Z | RTH open gap-down: STOP exits all 3 SIM positions — IWM @288.59 (-1.41%), GLD @403.96 (-1.80%), SLV @63.98 (-4.54%) | recorded for learning (arm A4), paper account untouched (positions were simulated) | book now FLAT
2026-06-05T14:12Z | learn(SPY,14d 1Min, 4 real fills incl. 3 stop exits): leader A7, active stays A0 FLAT | no structural change
2026-06-05T15:08Z | learn(SPY,14d 1Min): leader unchanged, active A0 FLAT held | no structural change
2026-06-05T16:03Z | learn(SPY,14d 1Min): leader A7, active A0 FLAT held | no structural change
2026-06-05T16:59Z | learn(SPY,14d 1Min): leader A7, active A0 FLAT held | no structural change
2026-06-05T17:55Z | learn(SPY,14d 1Min): leader A7, active A0 FLAT held | no structural change
2026-06-05T18:50Z | learn(SPY,14d 1Min): leader A7, active A0 FLAT held | no structural change
2026-06-05T19:46Z | ERROR: equity tick failed 2x (data.alpaca.markets connect timeout) — skipped this tick; book FLAT, no positions at risk
2026-06-05T19:48Z | learn(SPY,14d 1Min): network recovered; active A0 FLAT held | no structural change
2026-06-05T20:18Z | ERROR: equity tick failed 3x (data.alpaca.markets connect timeout) — tick + hourly skipped (will retry next tick); book FLAT, no risk
2026-06-05T20:44Z | learn(SPY,14d 1Min): active A0 FLAT held | no structural change
2026-06-06T12:12Z | ERROR: equity tick failed 2x (data.alpaca.markets connect timeout) - tick skipped; market closed, book FLAT, no positions at risk
2026-06-06T20:36Z | ERROR: equity tick 2x failed (data.alpaca.markets connect timeout) - skipped; market closed (weekend), book FLAT, no positions at risk
2026-06-06T21:02Z | ERROR: equity tick 2x failed (ECONNRESET + connect timeout) - skipped; market closed (weekend), book FLAT, no positions at risk
2026-06-07T00:37Z | ERROR: equity tick 2x failed (data.alpaca.markets connect timeout) - skipped; market closed (weekend), book FLAT, no positions at risk
- 2026-06-08T12:01Z [equity] market OPEN; learn SPY 14d (3614 bars, 4 fills) → leader A1, active A0 FLAT, no structural change
- 2026-06-08T12:57Z [equity] learn SPY 14d (3622 bars, 4 fills) → leader A1, active A0 FLAT, no structural change
- 2026-06-08T13:53Z [equity] learn SPY 14d (3646 bars, 4 fills) → leader now A5 (was A1), active A0 FLAT, no structural change
- 2026-06-08T14:49Z [equity] learn SPY 14d (3702 bars, 4 fills) → leader A5, active A0 FLAT, no structural change
- 2026-06-08T15:45Z [equity] learn SPY 14d (3758 bars, 4 fills) → leader now A3 (was A5), active A0 FLAT, no structural change
- 2026-06-08T16:41Z [equity] learn SPY 14d (3814 bars, 4 fills) → leader A3, active A0 FLAT, no structural change
- 2026-06-08T17:37Z [equity] learn SPY 14d (3871 bars, 4 fills) → leader A3, active A0 FLAT, no structural change
- 2026-06-08T18:33Z [equity] learn SPY 14d (3927 bars, 4 fills) → leader A3, active A0 FLAT, no structural change
- 2026-06-08T19:58Z [equity] learn SPY 14d (4013 bars) → leader A3, active A0 FLAT, no change
