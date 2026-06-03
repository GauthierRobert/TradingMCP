// Central dataset manifest: [name, minutesPerCandle, regimeTag]
export const DATASETS = [
  // deep bear (broad timeframes) — the target regime
  ['BTCUSDT_1h_bear2022', 60, 'bear'],
  ['ETHUSDT_1h_bear2022', 60, 'bear'],
  ['SOLUSDT_1h_bear2022', 60, 'bear'],
  ['BTCUSDT_15m_crashQ2', 15, 'bear'],
  ['ETHUSDT_15m_crashQ2', 15, 'bear'],
  // recent bear / chop
  ['BTCUSDT_15m_recentBear', 15, 'bear'],
  ['SOLUSDT_1h_recentBear', 60, 'bear'],
  ['ETHUSDT_1h_recentBear', 60, 'bear'],
  ['BTCUSDT_1h_recentBear', 60, 'chop'],
  ['BTCUSDT_1h_chop2023', 60, 'chop'],
  // controls — must not destroy bull performance
  ['BTCUSDT_1h_bull2024', 60, 'bull'],
  // 2026 YTD (real data, primary validation set — broad bear w/ a Mar-Apr relief rally)
  ['BTCUSDT_1h_2026ytd', 60, 'bear'],
  ['ETHUSDT_1h_2026ytd', 60, 'bear'],
  ['SOLUSDT_1h_2026ytd', 60, 'bear'],
  ['BNBUSDT_1h_2026ytd', 60, 'bear'],
  ['XRPUSDT_1h_2026ytd', 60, 'bear'],
  ['DOGEUSDT_1h_2026ytd', 60, 'bear'],
];
