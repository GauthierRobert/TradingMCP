---
name: run-alpaca-mcp
description: Build and start the Alpaca MCP server in Docker and wire it into Claude Code. Use when asked to start/run the Alpaca MCP server, build its Docker image, or connect Alpaca trading tools to Claude Code / Claude Desktop. Paper-trading by default.
---

# Start the Alpaca MCP server (Docker)

Stands up the [alpaca-mcp-server](https://github.com/alpacahq/alpaca-mcp-server) as a local
STDIO MCP server running inside Docker, and registers it with Claude Code. The container is
launched on demand by the MCP client (`docker run --rm -i …`) — there is no long-lived daemon
to babysit.

> **Safety:** defaults to **paper trading** (`ALPACA_PAPER_TRADE=true`). Only set it to `false`
> when the user explicitly asks for live trading against real money.

## Prerequisites

- Docker installed and running (`docker version` should succeed).
- Alpaca API key + secret. Paper-trading keys come from https://app.alpaca.markets/paper/dashboard/overview
  (toggle to "Paper" first). Never hard-code or commit these.

### Credentials live in Windows user-level env vars

On this machine the keys are already stored as **Windows user-level environment variables** —
`ALPACA_API_KEY` and `ALPACA_SECRET_KEY`. Do **not** ask the user to paste them; read them from
the registry instead:

```powershell
[Environment]::GetEnvironmentVariable('ALPACA_API_KEY','User')
[Environment]::GetEnvironmentVariable('ALPACA_SECRET_KEY','User')
```

> **Gotcha — process inheritance:** a process only inherits user-level env vars if it was launched
> *after* the vars were set. The current Claude Code / shell session may therefore NOT have them in
> its own environment (`$env:ALPACA_API_KEY` empty) even though the registry has them. The Docker
> **passthrough** form below (`-e VAR` with no `=value`) reads from the *launching* process's
> environment — so after registering, **restart Claude Code from a fresh Windows session** so it
> inherits the vars; only then will `/mcp` connect.

## 1. Build the image

```bash
git clone https://github.com/alpacahq/alpaca-mcp-server.git
cd alpaca-mcp-server
docker build -t mcp/alpaca:latest .
```

If the repo is already cloned, just `git pull` and re-run the `docker build`.

> **Gotcha — the image defaults to HTTP, not stdio.** The repo's `Dockerfile` `CMD` hard-codes
> `alpaca-mcp-server --transport streamable-http --host 0.0.0.0` (it's built for remote/Render
> hosting). If you `docker run` it bare it boots an HTTP server on :8000 and will **never** speak
> stdio — the MCP client shows "Failed to connect". You must **override the command** at run time
> with `alpaca-mcp-server --transport stdio`. (The CLI default is actually `stdio`; only the
> Dockerfile overrides it.) Every `docker run` below appends that override.

## 2. Smoke-test the container

Confirm the image boots and speaks the MCP JSON-RPC handshake over **stdio**. Send a full
handshake (`initialize` → `notifications/initialized` → `tools/list`); a bare `tools/list` may not
work. Reading the keys from the user env vars (PowerShell):

```powershell
$k = [Environment]::GetEnvironmentVariable('ALPACA_API_KEY','User')
$s = [Environment]::GetEnvironmentVariable('ALPACA_SECRET_KEY','User')
$f = Join-Path $env:TEMP 'mcp_smoke.jsonl'
@(
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"1.0"}}}'
  '{"jsonrpc":"2.0","method":"notifications/initialized"}'
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
) -join "`n" | ForEach-Object { [IO.File]::WriteAllText($f, $_ + "`n", (New-Object Text.UTF8Encoding($false))) }
cmd /c "type `"$f`" | docker run --rm -i -e ALPACA_API_KEY=$k -e ALPACA_SECRET_KEY=$s -e ALPACA_PAPER_TRADE=true mcp/alpaca:latest alpaca-mcp-server --transport stdio"
```

You should get back a JSON response listing ~62 Alpaca tools.

> Write the stdin **without a BOM** (the `UTF8Encoding($false)` above). If you pipe a PowerShell
> string straight into `docker` you can get a leading `﻿`, which makes the server reject the
> first message with `Invalid JSON: expected value at line 1 column 1`.

## 3. Register with Claude Code

Add the server at user scope so it launches the Docker container on demand. Use the **env-var
passthrough** form — `-e ALPACA_API_KEY` / `-e ALPACA_SECRET_KEY` with *no* `=value` — so Docker
pulls the secrets from the launching process's environment at run time and **nothing secret is
written into `~/.claude.json`**. Also append the `alpaca-mcp-server --transport stdio` override:

```bash
claude mcp add alpaca --scope user -- \
  docker run --rm -i \
  -e ALPACA_API_KEY \
  -e ALPACA_SECRET_KEY \
  -e ALPACA_PAPER_TRADE=true \
  mcp/alpaca:latest alpaca-mcp-server --transport stdio
```

Verify with `/mcp` inside the Claude Code CLI — `alpaca` should appear as connected. If it shows
**Failed to connect**, the launching Claude Code process probably doesn't have the env vars yet:
restart Claude Code from a fresh Windows session (see the inheritance gotcha in Prerequisites).

### Equivalent JSON config

For clients edited by hand (`.mcp.json` for Claude Code, `claude_desktop_config.json` for
Claude Desktop), the same wiring is (passthrough env vars + stdio override):

```json
{
  "mcpServers": {
    "alpaca": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "ALPACA_API_KEY",
        "-e", "ALPACA_SECRET_KEY",
        "-e", "ALPACA_PAPER_TRADE=true",
        "mcp/alpaca:latest", "alpaca-mcp-server", "--transport", "stdio"
      ]
    }
  }
}
```

> Passthrough only works if the MCP client process has `ALPACA_API_KEY` / `ALPACA_SECRET_KEY` in
> its own environment. If you can't guarantee that, bake the values in instead (`-e
> ALPACA_API_KEY=<value>`), accepting that the plaintext secrets then live in the config file.

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `ALPACA_API_KEY` | yes | Alpaca API key — stored as a Windows **user-level** env var; passed through to the container |
| `ALPACA_SECRET_KEY` | yes | Alpaca API secret — stored as a Windows **user-level** env var; passed through to the container |
| `ALPACA_PAPER_TRADE` | no | `true` (default) = paper; `false` = **live, real-money** trading |

After changing config, restart the MCP client so it relaunches the container (also required for
it to pick up newly-set user env vars — see the inheritance gotcha in Prerequisites).
