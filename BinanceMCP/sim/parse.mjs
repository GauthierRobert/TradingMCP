import fs from 'fs';

const lines = fs.readFileSync('sim/raw.jsonl', 'utf8').split('\n').filter(Boolean);
const byId = {};
for (const l of lines) {
  try {
    const o = JSON.parse(l);
    if (o.id != null) byId[o.id] = o;
  } catch (e) { /* skip non-json */ }
}

function textOf(id) {
  const o = byId[id];
  if (!o || !o.result || !o.result.content) throw new Error('no result for id ' + id);
  return o.result.content[0].text;
}

// id2 = get24hStats, id3 = klines 1m, id4 = klines 5m
const stats = JSON.parse(textOf(2));
const k1m = JSON.parse(textOf(3));
const k5m = JSON.parse(textOf(4));

// Binance kline row: [openTime, open, high, low, close, volume, closeTime, ...]
function toCandles(rows) {
  return rows.map(r => ({
    t: r[0],
    o: +r[1], h: +r[2], l: +r[3], c: +r[4], v: +r[5],
    ct: r[6],
  }));
}
const c1 = toCandles(k1m);
const c5 = toCandles(k5m);

fs.writeFileSync('sim/stats.json', JSON.stringify(stats, null, 2));
fs.writeFileSync('sim/k1m.json', JSON.stringify(c1));
fs.writeFileSync('sim/k5m.json', JSON.stringify(c5));

const span = (a) => {
  const first = new Date(a[0].t).toISOString();
  const last = new Date(a[a.length-1].ct).toISOString();
  return `${a.length} candles  ${first} -> ${last}`;
};

console.log('=== get24hStats BTCUSDT ===');
console.log('lastPrice     ', stats.lastPrice);
console.log('priceChange   ', stats.priceChange, '(' + stats.priceChangePercent + '%)');
console.log('high / low    ', stats.highPrice, '/', stats.lowPrice);
console.log('weightedAvg   ', stats.weightedAvgPrice);
console.log('volume(BTC)   ', stats.volume);
console.log('quoteVol(USDT)', stats.quoteVolume);
console.log('openTime      ', new Date(stats.openTime).toISOString());
console.log('closeTime     ', new Date(stats.closeTime).toISOString());
console.log('trades        ', stats.count);
console.log();
console.log('1m klines:', span(c1));
console.log('5m klines:', span(c5));
console.log('1m price range over window:',
  Math.min(...c1.map(x=>x.l)).toFixed(2), '->', Math.max(...c1.map(x=>x.h)).toFixed(2));
