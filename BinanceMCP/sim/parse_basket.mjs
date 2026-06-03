import fs from 'fs';

const idMap = { 2:'ETHUSDT_1m', 3:'ETHUSDT_5m', 4:'SOLUSDT_1m', 5:'SOLUSDT_5m',
  6:'BNBUSDT_1m', 7:'BNBUSDT_5m', 8:'XRPUSDT_1m', 9:'XRPUSDT_5m',
  10:'DOGEUSDT_1m', 11:'DOGEUSDT_5m' };

const files = ['sim/data/raw_basket.jsonl','sim/data/raw_basket2.jsonl','sim/data/raw_basket3.jsonl'];
const got = {};
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  for (const l of fs.readFileSync(f,'utf8').split('\n').filter(Boolean)) {
    try { const o = JSON.parse(l);
      if (o.id && idMap[o.id] && o.result && o.result.content) got[o.id] = o.result.content[0].text;
    } catch(e) {}
  }
}
const toCandles = rows => rows.map(r => ({ t:r[0], o:+r[1], h:+r[2], l:+r[3], c:+r[4], v:+r[5], ct:r[6] }));

const written = [];
for (const [id, name] of Object.entries(idMap)) {
  if (!got[id]) continue;
  const c = toCandles(JSON.parse(got[id]));
  fs.writeFileSync(`sim/data/${name}.json`, JSON.stringify(c));
  written.push({ name, n:c.length, chg: ((c[c.length-1].c/c[0].o-1)*100).toFixed(2)+'%' });
}
// include BTC from earlier
for (const [src,name] of [['sim/k1m.json','BTCUSDT_1m'],['sim/k5m.json','BTCUSDT_5m']]) {
  if (fs.existsSync(src)) { const c = JSON.parse(fs.readFileSync(src,'utf8'));
    fs.writeFileSync(`sim/data/${name}.json`, JSON.stringify(c));
    written.push({ name, n:c.length, chg: ((c[c.length-1].c/c[0].o-1)*100).toFixed(2)+'%' }); }
}
written.sort((a,b)=>a.name.localeCompare(b.name));
console.log('Datasets ready (name, candles, net change over window):');
for (const w of written) console.log(`  ${w.name.padEnd(14)} ${String(w.n).padStart(5)}  ${w.chg.padStart(8)}`);
