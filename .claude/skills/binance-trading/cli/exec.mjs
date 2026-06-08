#!/usr/bin/env node
// binance-trading write-side CLI — deterministic order execution for Binance spot.
//
// SIMULATION-FIRST. By default (BINANCE_TRADING_ENABLED != "true" or no keys) this NEVER
// touches the trading API: it fetches the public price, computes the intended order + fee,
// and prints a SIMULATED plan + recordHint. It only signs and sends a real order when
// BINANCE_TRADING_ENABLED=true AND BINANCE_API_KEY/BINANCE_SECRET_KEY are set — mirroring
// the Java MCP server's safety posture (server default: BINANCE_TRADING_ENABLED=false).
//
// This is the recommended path for the *mechanical* write step of a scalper tick; the
// Binance MCP stays available as the fallback. Fee floor assumed 0.10%/fill.
//
//   node exec.mjs price   <SYM>                                  (public, always real)
//   node exec.mjs account                                        (signed; needs keys+enabled)
//   node exec.mjs buy  <SYM> (--quote N | --qty Q) [--limit PX]
//   node exec.mjs sell <SYM> (--quote N | --qty Q) [--limit PX]
//   node exec.mjs cancel <SYM> <ORDER_ID>
//
// Symbols are Binance spot tickers, e.g. BTCUSDT, ETHUSDT.

import crypto from 'node:crypto';

const BASE = 'https://api.binance.com';
const FEE = 0.001; // 0.10% per fill

const [cmd, ...rest] = process.argv.slice(2);
const pos = [];
const flags = {};
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) flags[key] = true;
    else { flags[key] = next; i++; }
  } else pos.push(a);
}

const ENABLED = process.env.BINANCE_TRADING_ENABLED === 'true';
const KEY = process.env.BINANCE_API_KEY;
const SECRET = process.env.BINANCE_SECRET_KEY;
const LIVE = ENABLED && KEY && SECRET; // real-order mode

const out = (o) => console.log(JSON.stringify(o, null, flags.json ? 0 : 2));
function die(msg, code = 1) { console.error('ERROR:', msg); process.exit(code); }

async function pub(path) {
  const r = await fetch(`${BASE}${path}`);
  const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t; }
  if (!r.ok) die(`GET ${path} -> ${r.status} ${typeof d === 'string' ? d : JSON.stringify(d)}`, 2);
  return d;
}

async function signed(method, path, params = {}) {
  if (!LIVE) die('signed call requires BINANCE_TRADING_ENABLED=true and BINANCE_API_KEY/BINANCE_SECRET_KEY', 3);
  const qs = new URLSearchParams({ ...params, timestamp: String(Date.now()), recvWindow: '5000' }).toString();
  const sig = crypto.createHmac('sha256', SECRET).update(qs).digest('hex');
  const r = await fetch(`${BASE}${path}?${qs}&signature=${sig}`, {
    method, headers: { 'X-MBX-APIKEY': KEY },
  });
  const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t; }
  if (!r.ok) die(`${method} ${path} -> ${r.status} ${typeof d === 'string' ? d : JSON.stringify(d)}`, 2);
  return d;
}

const priceOf = async (sym) => +(await pub(`/api/v3/ticker/price?symbol=${sym}`)).price;

async function order(side) {
  const sym = pos[0];
  if (!sym) die(`symbol required, e.g. exec.mjs ${side} BTCUSDT --quote 100`);
  if (!flags.quote && !flags.qty) die('one of --quote (quote amount, e.g. USDT) or --qty (base qty) is required');
  const px = flags.limit ? +flags.limit : await priceOf(sym);
  const qty = flags.qty ? +flags.qty : +(+flags.quote / px).toFixed(6);
  const quote = flags.quote ? +flags.quote : +(qty * px).toFixed(2);
  const fee = +(quote * FEE).toFixed(4);

  if (!LIVE) {
    out({ mode: 'SIMULATED', reason: ENABLED ? 'no API keys set' : 'BINANCE_TRADING_ENABLED!=true',
      symbol: sym, side, type: flags.limit ? 'LIMIT' : 'MARKET', price: px, qty, quote, estFee: fee,
      recordHint: side === 'BUY'
        ? `(from the scalper engine dir) node run.mjs opened "${sym}" ${px} ${qty} <ARM>`
        : `(from the scalper engine dir) node run.mjs closed "${sym}" ${px}` });
    return;
  }

  const params = { symbol: sym, side, type: flags.limit ? 'LIMIT' : 'MARKET' };
  if (flags.limit) { params.timeInForce = 'GTC'; params.price = px; params.quantity = qty; }
  else if (flags.quote && side === 'BUY') params.quoteOrderQty = quote; // market buy by quote
  else params.quantity = qty;
  const o = await signed('POST', '/api/v3/order', params);
  const fillPx = o.fills?.length ? +o.fills[0].price : px;
  out({ mode: 'LIVE', orderId: o.orderId, symbol: o.symbol, side: o.side, status: o.status,
    executedQty: o.executedQty, cummulativeQuoteQty: o.cummulativeQuoteQty, fillPx,
    recordHint: side === 'BUY'
      ? `(from the scalper engine dir) node run.mjs opened "${sym}" ${fillPx} ${o.executedQty} <ARM>`
      : `(from the scalper engine dir) node run.mjs closed "${sym}" ${fillPx}` });
}

async function main() {
  switch (cmd) {
    case 'price': {
      const sym = pos[0]; if (!sym) die('symbol required');
      out({ symbol: sym, price: await priceOf(sym) });
      break;
    }
    case 'account': {
      const a = await signed('GET', '/api/v3/account');
      out((a.balances || []).filter(b => +b.free > 0 || +b.locked > 0)
        .map(b => ({ asset: b.asset, free: +b.free, locked: +b.locked })));
      break;
    }
    case 'buy': await order('BUY'); break;
    case 'sell': await order('SELL'); break;
    case 'cancel': {
      const [sym, id] = pos; if (!sym || !id) die('usage: cancel <SYM> <ORDER_ID>');
      out(await signed('DELETE', '/api/v3/order', { symbol: sym, orderId: id }));
      break;
    }
    default:
      console.log(`binance write-side CLI (SIMULATION-first; LIVE only if BINANCE_TRADING_ENABLED=true + keys)
mode: ${LIVE ? 'LIVE (real orders!)' : 'SIMULATED'}
commands: price | account | buy | sell | cancel
  buy/sell <SYM> (--quote N | --qty Q) [--limit PX]
  cancel <SYM> <ORDER_ID>`);
  }
}
main();
