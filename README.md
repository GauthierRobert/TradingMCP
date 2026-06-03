# TradingMCP

A collection of [Model Context Protocol](https://modelcontextprotocol.io) (MCP) servers and
tooling for trading. Each solution lives in its own top-level folder.

## Solutions

| Folder | Description | Stack |
|--------|-------------|-------|
| [`BinanceMCP/`](BinanceMCP/) | Local STDIO MCP server exposing Binance Spot market data, account data, and trading as tools. | Java 25 · Spring Boot 4 · Spring AI (MCP server starter) · Maven |

See each folder's own `README.md` for build, configuration, and client-wiring instructions.

## Conventions

- One folder per MCP solution; keep each self-contained (its own build, README, and config).
- **Never commit credentials.** API keys/secrets come from environment variables only.
