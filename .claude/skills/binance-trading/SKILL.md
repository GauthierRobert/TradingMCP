---
name: binance-trading
description: THE single Binance skill — runs ALL Binance spot strategies (SIMULATION-ONLY by default, BINANCE_TRADING_ENABLED=false) from one place. Subcommands; tick = 1-min adaptive scalper (BTCUSDT, ETHUSDT, ... fee floor 0.10%/fill, far lower than Alpaca crypto); aggressive-tick = the very aggressive variant (explicit opt-in); decide <PAIR> = ad-hoc BUY/SELL/HOLD; scan = BUY-setup sweep; status = ledgers + state. Use for ANY Binance trading request (run/launch/tick the strategy, analyse, status). The user schedules it manually (/schedule or asking for a cron) — this skill never creates schedules itself. Engines live under this skill's engines/ subfolder (each has an ENGINE.md). For Alpaca use alpaca-trading.
allowed-tools: Bash, Read, Write, Glob, Grep
---

# binance-trading — toutes les stratégies Binance, un seul skill

**SIMULATION-ONLY par défaut** (`BINANCE_TRADING_ENABLED=false` côté serveur MCP). Chaque
sous-commande orchestre un moteur existant — lire son `ENGINE.md` avant la première utilisation
d'une stratégie dans la session.

| Sous-commande | Moteur (dossier sous `.claude/skills/`) |
|---|---|
| `tick` | `binance-adaptive-scalper` (1-min, bandit auto-tuné, fee-aware 0,10 %) |
| `aggressive-tick` | `binance-aggressive-scalper` (LIMIT_MAKER, gate ATR, order-book — opt-in explicite) |
| `decide <PAIR>` | `binance-trading-skills` (BUY/SELL/HOLD argumenté via outils MCP Binance) |
| `scan` | scan multi-paires des scalpers |
| `status` | `_state/SESSIONS.md` + état des bandits |

## `tick` — procédure (sois bref)

1. Dans `.claude/skills/binance-trading/engines/binance-adaptive-scalper`, suivre la procédure tick de son `ENGINE.md`
   (mêmes principes que le scalper Alpaca : `run.mjs tick` → plan → exécution → record des fills).
2. Ordres uniquement si le trading est explicitement activé ; sinon simuler et logger comme tel.
3. Ledger : une ligne **uniquement si événement** (ordre/learn/erreur) — jamais de no-op.

## Scheduling — MANUEL, par l'utilisateur

Identique à `alpaca-trading` : ce skill ne crée jamais de cron/routine lui-même. `/schedule`
distant = min 1 h et pas de MCP local ; cron in-session = 1 min possible mais vit avec la session.

## Règles

- Avantage structurel vs Alpaca crypto : fee floor ~0,20 % aller-retour (vs ~0,58 %) — un edge
  1-min y est plus plausible, mais reste à prouver sur données réelles avant tout déploiement.
- Verdict par défaut : ne pas trader. Le serveur MCP Binance doit tourner (`run-binance-mcp`).
