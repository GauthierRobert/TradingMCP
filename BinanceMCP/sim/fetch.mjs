// Paginating Binance klines fetcher (public endpoint, no key).
// Usage: node sim/fetch.mjs <SYMBOL> <interval> <startISO> <endISO> <outTag>
// e.g.   node sim/fetch.mjs BTCUSDT 1h 2022-01-01 2023-01-01 bear2022
// Saves sim/data/<SYMBOL>_<interval>_<outTag>.json in {t,o,h,l,c,v,ct} format.
import fs from 'fs';

const INTERVAL_MS = {
  '1m': 60e3, '3m': 180e3, '5m': 300e3, '15m': 900e3, '30m': 1800e3,
  '1h': 3600e3, '2h': 7200e3, '4h': 14400e3, '6h': 21600e3, '12h': 43200e3, '1d': 86400e3,
};

async function fetchKlines(symbol, interval, startMs, endMs) {
  const step = INTERVAL_MS[interval];
  const out = [];
  let cur = startMs;
  while (cur < endMs) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${cur}&endTime=${endMs}&limit=1000`;
    let rows;
    for (let attempt = 0; ; attempt++) {
      try { const r = await fetch(url); rows = await r.json(); break; }
      catch (e) { if (attempt >= 4) throw e; await new Promise(s => setTimeout(s, 500 * (attempt + 1))); }
    }
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const k of rows) out.push({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5], ct: k[6] });
    const lastOpen = rows[rows.length - 1][0];
    if (rows.length < 1000) break;
    cur = lastOpen + step;
  }
  return out;
}

const [symbol, interval, startISO, endISO, tag] = process.argv.slice(2);
if (!symbol || !interval || !startISO || !endISO || !tag) {
  console.error('args: <SYMBOL> <interval> <startISO> <endISO> <outTag>'); process.exit(1);
}
const startMs = Date.parse(startISO), endMs = Date.parse(endISO);
const data = await fetchKlines(symbol, interval, startMs, endMs);
const path = `sim/data/${symbol}_${interval}_${tag}.json`;
fs.writeFileSync(path, JSON.stringify(data));
const chg = data.length ? ((data[data.length - 1].c / data[0].o - 1) * 100).toFixed(1) : 'n/a';
console.log(`${path}  ${data.length} bars  ${new Date(data[0].t).toISOString().slice(0,10)} -> ${new Date(data[data.length-1].t).toISOString().slice(0,10)}  chg ${chg}%`);
