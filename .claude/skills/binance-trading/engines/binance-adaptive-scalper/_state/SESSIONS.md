# binance-adaptive-scalper — session ledger

One line per autopilot tick. Venue: Binance spot (USDT pairs). SIMULATION-ONLY by default
(`BINANCE_TRADING_ENABLED=false` blocks live orders). The bandit starts FLAT (A0) and only
deploys a trading arm once a `learn` pass proves one clears the ~0.33% fee floor on real bars.

