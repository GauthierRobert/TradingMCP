---
name: add-binance-tool
description: Add a new Binance MCP tool to this server. Use when asked to expose a new Binance REST endpoint as an MCP tool (e.g. "add a tool for average price", "support OCO orders").
---

# Add a Binance MCP tool

Follow the existing pattern exactly. Tools are `@Tool`-annotated methods on a class in
`src/main/java/com/binancemcp/tools/`.

## Steps

1. **Pick the right class** by area:
   - Public market data → `MarketDataTools`
   - Signed read-only account data → `AccountTools`
   - Signed mutating (orders) → `TradingTools`
   If none fits, create a new `@Component` class in `tools/` and register it in the
   `binanceTools(...)` `ToolCallbackProvider` bean in `BinanceMcpApplication`.

2. **Write the method.** Every parameter gets `@ToolParam` with a clear description; optional ones
   use `required = false` and a boxed type (e.g. `Integer`).

   ```java
   @Tool(description = "Get the current average price for a symbol. Returns JSON.")
   public String getAvgPrice(
           @ToolParam(description = "Trading pair symbol, e.g. BTCUSDT") String symbol) {
       return client.getPublic("/api/v3/avgPrice", Map.of("symbol", symbol.toUpperCase()));
   }
   ```

3. **Call Binance through `BinanceClient` only:**
   - Public/unsigned: `client.getPublic(path, params)`
   - Signed: `client.signed(HttpMethod.GET|POST|DELETE, path, params)` — timestamp, recvWindow
     and signature are added automatically.

4. **Rules to respect** (see `CLAUDE.md`):
   - Return the raw JSON string; don't build a DTO.
   - Upper-case symbols before sending.
   - Mutating tools must call `requireTradingEnabled()` first.
   - Never log to stdout; never log credentials.

5. **Verify:** `mvn -q clean verify`. Find the endpoint path/params in the
   [Binance Spot API docs](https://developers.binance.com/docs/binance-spot-api-docs).
