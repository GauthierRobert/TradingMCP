---
name: run-binance-mcp
description: Build, run, and wire up this Binance MCP server into an MCP client. Use when asked to build/start the server, smoke-test it, or connect it to Claude Desktop / Claude Code.
---

# Run & wire up the Binance MCP server

## Build

```bash
mvn -q clean package      # -> target/binance-mcp-server-0.1.0.jar
```

## Configure credentials (env vars)

```
BINANCE_API_KEY=<your key>
BINANCE_SECRET_KEY=<your secret>
BINANCE_TRADING_ENABLED=false      # set true ONLY to allow live order placement/cancel
```

Public market-data tools work without any keys. Account/trading tools need keys.

## Smoke test the JSON-RPC handshake

The server speaks JSON-RPC over stdio. To confirm it boots and lists tools:

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | java -jar target/binance-mcp-server-0.1.0.jar
```

You should get a JSON response listing the tools. Logs go to `logs/binance-mcp-server.log`
(never stdout — that would corrupt the protocol).

## Wire into a client

Point the client at the built jar. Example MCP server entry (used by Claude Desktop's
`claude_desktop_config.json` and by `.mcp.json` for Claude Code):

```json
{
  "mcpServers": {
    "binance": {
      "command": "java",
      "args": ["-jar", "C:\\Users\\gauth\\Documents\\Dev Projects\\BinanceMCP\\target\\binance-mcp-server-0.1.0.jar"],
      "env": {
        "BINANCE_API_KEY": "your-key",
        "BINANCE_SECRET_KEY": "your-secret",
        "BINANCE_TRADING_ENABLED": "false"
      }
    }
  }
}
```

Rebuild (`mvn -q clean package`) after changing tools, then restart the client.
