#!/usr/bin/env node
// alpaca-trading write-side CLI — deterministic order execution against the Alpaca
// PAPER trading REST API, with NO MCP and NO Claude reasoning in the loop.
//
// Why this exists: the scalper/charter engines already emit a JSON *plan*. Executing
// that plan (place order / close position / read account) is mechanical — it does not
// need an LLM. Routing it through the Alpaca MCP loads ~60 tool schemas into context and
// makes each fill nondeterministic. This CLI is the recommended path for those writes;
// the MCP stays available as a fallback.
//
// PAPER ONLY — hardwired to paper-api.alpaca.markets. There is no live endpoint here.
//
//   node exec.mjs account            [--account default|p1]
//   node exec.mjs positions          [--account ...] [--json]
//   node exec.mjs orders             [--status open|closed|all] [--limit 50]
//   node exec.mjs buy  <SYM> (--notional N | --qty Q) [--limit PX] [--tif gtc|day|ioc]
//   node exec.mjs sell <SYM> (--notional N | --qty Q) [--limit PX] [--tif ...]
//   node exec.mjs close <SYM>        [--qty Q | --pct P]
//   node exec.mjs close-all
//   node exec.mjs cancel <ORDER_ID>
//   node exec.mjs cancel-all
//
// Symbols: crypto uses "BTC/USD" (auto tif=gtc); equities use "AAPL" (auto tif=day).
// Output is JSON on stdout; non-zero exit on API error. For BUY/SELL it also prints a
// `recordHint` line you can paste to fold the fill back into the bandit ledger.

const BASE = 'https://paper-api.alpaca.markets';

// ---- arg parsing -------------------------------------------------------------
const [cmd, ...rest] = process.argv.slice(2);
const pos = [];
const flags = {};
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) { flags[key] = true; }
    else { flags[key] = next; i++; }
  } else pos.push(a);
}

// ---- credentials (paper) -----------------------------------------------------
function creds() {
  const which = (flags.account || 'default').toLowerCase();
  const key = which === 'p1' ? process.env.ALPACA_API_KEY_P1 : process.env.ALPACA_API_KEY;
  const secret = which === 'p1' ? process.env.ALPACA_SECRET_KEY_P1 : process.env.ALPACA_SECRET_KEY;
  if (!key || !secret) die(`missing paper credentials for account "${which}" (need ${which === 'p1' ? 'ALPACA_API_KEY_P1/ALPACA_SECRET_KEY_P1' : 'ALPACA_API_KEY/ALPACA_SECRET_KEY'})`);
  return { key, secret, which };
}

function die(msg, code = 1) { console.error('ERROR:', msg); process.exit(code); }

async function api(method, path, body) {
  const { key, secret } = creds();
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'APCA-API-KEY-ID': key,
      'APCA-API-SECRET-KEY': secret,
      'accept': 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) die(`${method} ${path} -> ${r.status} ${typeof data === 'string' ? data : JSON.stringify(data)}`, 2);
  return data;
}

const out = (o) => console.log(JSON.stringify(o, null, flags.json ? 0 : 2));
const isCrypto = (sym) => sym.includes('/');

// ---- commands ----------------------------------------------------------------
async function main() {
  switch (cmd) {
    case 'account': {
      const a = await api('GET', '/v2/account');
      out({ account: creds().which, status: a.status, equity: +a.equity, cash: +a.cash,
        buying_power: +a.buying_power, portfolio_value: +a.portfolio_value,
        daytrade_count: a.daytrade_count, trading_blocked: a.trading_blocked });
      break;
    }
    case 'positions': {
      const ps = await api('GET', '/v2/positions');
      out(flags.json ? ps : ps.map(p => ({ symbol: p.symbol, qty: +p.qty, side: p.side,
        avg_entry: +p.avg_entry_price, current: +p.current_price,
        market_value: +p.market_value, unrealized_pl: +p.unrealized_pl,
        unrealized_plpc: +(p.unrealized_plpc * 100).toFixed(2) + '%' })));
      break;
    }
    case 'orders': {
      const status = flags.status || 'open';
      const limit = flags.limit || 50;
      const ords = await api('GET', `/v2/orders?status=${status}&limit=${limit}&direction=desc`);
      out(ords.map(o => ({ id: o.id, symbol: o.symbol, side: o.side, type: o.type,
        qty: o.qty, notional: o.notional, limit_price: o.limit_price, status: o.status,
        filled_qty: o.filled_qty, filled_avg_price: o.filled_avg_price, submitted_at: o.submitted_at })));
      break;
    }
    case 'buy':
    case 'sell': {
      const sym = pos[0];
      if (!sym) die('symbol required, e.g. exec.mjs buy "BTC/USD" --notional 500');
      if (!flags.notional && !flags.qty) die('one of --notional or --qty is required');
      const crypto = isCrypto(sym);
      const body = {
        symbol: sym,
        side: cmd,
        type: flags.limit ? 'limit' : 'market',
        time_in_force: flags.tif || (crypto ? 'gtc' : 'day'),
      };
      if (flags.notional) body.notional = +flags.notional; else body.qty = +flags.qty;
      if (flags.limit) body.limit_price = +flags.limit;
      const o = await api('POST', '/v2/orders', body);
      const fillPx = o.filled_avg_price ? +o.filled_avg_price : (flags.limit ? +flags.limit : null);
      const fillQty = o.filled_qty ? +o.filled_qty : (flags.qty ? +flags.qty : null);
      // NOTE: crypto market orders may not fill instantly on Alpaca paper — status can be
      // `new`/`pending_new` with no fill yet. The recordHint always reflects the *intent*
      // (a buy is an open, a sell a close); fill in the real fill price once it settles.
      out({ id: o.id, symbol: o.symbol, side: o.side, type: o.type, status: o.status,
        submitted: { notional: body.notional ?? null, qty: body.qty ?? null, limit_price: body.limit_price ?? null },
        filled_avg_price: o.filled_avg_price, filled_qty: o.filled_qty,
        recordHint: cmd === 'buy'
          ? `(from the scalper engine dir) node run.mjs opened "${sym}" ${fillPx ?? '<fillPx>'} ${fillQty ?? '<fillQty>'} <ARM>`
          : `(from the scalper engine dir) node run.mjs closed "${sym}" ${fillPx ?? '<fillPx>'}` });
      break;
    }
    case 'close': {
      const sym = pos[0];
      if (!sym) die('symbol required');
      // Alpaca keys crypto positions WITHOUT the slash ("BTCUSD"), even though orders use
      // "BTC/USD". Normalise so `close "BTC/USD"` matches the held position.
      const posSym = isCrypto(sym) ? sym.replace('/', '') : sym;
      const q = flags.qty ? `?qty=${flags.qty}` : flags.pct ? `?percentage=${flags.pct}` : '';
      const o = await api('DELETE', `/v2/positions/${encodeURIComponent(posSym)}${q}`);
      out({ closed: sym, order_id: o.id, status: o.status, qty: o.qty,
        recordHint: `(from the scalper engine dir) node run.mjs closed "${sym}" <fillPx>` });
      break;
    }
    case 'close-all': {
      const r = await api('DELETE', '/v2/positions?cancel_orders=true');
      out({ closed: Array.isArray(r) ? r.length : r, detail: r });
      break;
    }
    case 'cancel': {
      const id = pos[0]; if (!id) die('order id required');
      await api('DELETE', `/v2/orders/${id}`);
      out({ canceled: id });
      break;
    }
    case 'cancel-all': {
      const r = await api('DELETE', '/v2/orders');
      out({ canceled: r });
      break;
    }
    default:
      console.log(`alpaca write-side CLI (PAPER only)
commands: account | positions | orders | buy | sell | close | close-all | cancel | cancel-all
  buy/sell <SYM> (--notional N | --qty Q) [--limit PX] [--tif gtc|day|ioc] [--account default|p1]
  close <SYM> [--qty Q | --pct P]
flags: --account default|p1   --json (compact)`);
  }
}
main();
