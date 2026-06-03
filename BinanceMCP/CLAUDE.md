# Binance MCP Server — project rules

A **local STDIO MCP server** exposing Binance Spot tools, built with **Java 25 + Spring Boot 4 +
Spring AI 2.0.0-M8 (MCP server starter)** and Maven.

## Architecture (keep it simple)

- `config/BinanceProperties` — `binance.*` config bound from env vars.
- `client/BinanceClient` — the only place that talks HTTP to Binance. `getPublic(...)` for
  unsigned endpoints, `signed(...)` for endpoints needing the API key + HMAC-SHA256 signature.
- `tools/` — MCP tools grouped by area: `MarketDataTools` (public), `AccountTools` (signed,
  read-only), `TradingTools` (signed, mutating).
- `BinanceMcpApplication` — registers tool beans via a single `ToolCallbackProvider`.

## Hard rules

1. **Never write to stdout.** stdout is the MCP JSON-RPC channel. No `System.out.println`, no
   console logging. Logs go to `logs/binance-mcp-server.log` (configured in `application.yml`).
   If you add logging, use SLF4J — never `System.out`.
2. **Never hard-code or commit credentials.** API key/secret come from `BINANCE_API_KEY` /
   `BINANCE_SECRET_KEY` only. Do not log them.
3. **All HTTP goes through `BinanceClient`.** Tools must not build their own `RestClient`.
4. **Trading is guarded.** Mutating tools must call `requireTradingEnabled()`; live orders are
   only allowed when `binance.trading-enabled=true`.
5. Tools return **raw JSON strings** from Binance — don't build DTOs for every payload.

## Conventions

- New tool method = a `@Tool`-annotated method on a `tools/` class, with `@ToolParam` on every
  argument (clear description; `required = false` for optionals). Then add the bean to the
  `binanceTools(...)` provider in `BinanceMcpApplication` if it's a new class.
- Symbols are upper-cased before sending (e.g. `btcusdt` -> `BTCUSDT`).
- Binance API reference: https://developers.binance.com/docs/binance-spot-api-docs

## Build & run

```bash
mvn -q clean verify           # build + tests
mvn -q spring-boot:run        # run locally (will wait on stdin — it's a STDIO server)
mvn -q clean package          # produces target/binance-mcp-server-0.1.0.jar
```

See `README.md` for wiring it into an MCP client (Claude Desktop / Claude Code).
