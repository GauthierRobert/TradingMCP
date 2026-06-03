# Binance MCP Server

A local [Model Context Protocol](https://modelcontextprotocol.io) server that exposes Binance
Spot **market data, account data, and trading** as tools an AI client can call.

- **Java 25**, **Spring Boot 4**, **Spring AI 2.0.0-M8** (`spring-ai-starter-mcp-server`), Maven
- **STDIO** transport (the client launches the process and talks over stdin/stdout)
- Local only

## Tools

| Class | Tool | Auth |
|-------|------|------|
| `MarketDataTools` | `getPrice`, `get24hStats`, `getOrderBook`, `getKlines`, `getExchangeInfo` | none |
| `AccountTools` | `getAccount`, `getOpenOrders`, `getMyTrades` | API key (read) |
| `TradingTools` | `placeOrder`, `cancelOrder`, `getOrder` | API key (trade) |

## Configuration

All via environment variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `BINANCE_API_KEY` | for account/trading | Binance API key |
| `BINANCE_SECRET_KEY` | for account/trading | Binance API secret (used to HMAC-sign requests) |
| `BINANCE_TRADING_ENABLED` | no (default `false`) | Must be `true` to place/cancel real orders |

Market-data tools need no credentials. **Credentials are never logged or committed.**

> ⚠️ This server can place **real** orders with real money when trading is enabled and a
> trade-permitted key is configured. Keep `BINANCE_TRADING_ENABLED=false` unless you mean it.

## Build & run

```bash
mvn clean package                                   # build -> target/binance-mcp-server-0.1.0.jar
mvn clean verify                                    # build + tests
```

Smoke-test the protocol:

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | java -jar target/binance-mcp-server-0.1.0.jar
```

## Connect to a client

Add to your MCP client config (Claude Desktop `claude_desktop_config.json`, or `.mcp.json` for
Claude Code) — see `.mcp.json` in this repo for a ready template:

```json
{
  "mcpServers": {
    "binance": {
      "command": "java",
      "args": ["-jar", "<absolute-path>/target/binance-mcp-server-0.1.0.jar"],
      "env": {
        "BINANCE_API_KEY": "...",
        "BINANCE_SECRET_KEY": "...",
        "BINANCE_TRADING_ENABLED": "false"
      }
    }
  }
}
```

## Working on this repo with Claude Code

- `CLAUDE.md` holds the project rules (STDIO/stdout constraint, credential handling, tool pattern).
- Skills in `.claude/skills/`: **add-binance-tool** (extend the server) and **run-binance-mcp**
  (build/run/wire up).
- Suggested local permissions (add to `.claude/settings.local.json` yourself if you want fewer
  prompts):
  ```json
  { "permissions": { "allow": ["Bash(mvn:*)"] } }
  ```

## Logs

Written to `logs/binance-mcp-server.log`. Nothing is logged to stdout, because stdout is the
JSON-RPC channel.
