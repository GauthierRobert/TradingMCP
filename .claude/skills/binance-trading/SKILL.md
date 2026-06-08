---
name: binance-trading
description: THE single Binance skill — runs ALL Binance spot strategies (SIMULATION-ONLY by default, BINANCE_TRADING_ENABLED=false) from one place. Subcommands; tick = 1-min adaptive scalper (BTCUSDT, ETHUSDT, ... fee floor 0.10%/fill, far lower than Alpaca crypto); aggressive-tick = the very aggressive variant (explicit opt-in); decide <PAIR> = ad-hoc BUY/SELL/HOLD; scan = BUY-setup sweep; status = ledgers + state. Use for ANY Binance trading request (run/launch/tick the strategy, analyse, status). The user schedules it manually (/schedule or asking for a cron) — this skill never creates schedules itself. Engines live under this skill's engines/ subfolder (each has an ENGINE.md). For Alpaca crypto use alpaca-crypto; for Alpaca US stocks/ETFs use alpaca-stocks.
allowed-tools: Bash, Read, Write, Glob, Grep
---

# binance-trading — toutes les stratégies Binance, un seul skill

**SIMULATION-ONLY par défaut** (`BINANCE_TRADING_ENABLED=false` côté serveur MCP). Chaque
sous-commande orchestre un moteur existant — lire son `ENGINE.md` avant la première utilisation
d'une stratégie dans la session.

| Sous-commande | Moteur (dossier sous `.claude/skills/`) |
|---|---|
| `tick` | `binance-adaptive-scalper` (1-min, bandit auto-tuné, fee-aware 0,10 %) + `binance-mean-reversion` (oversold long / overbought short[sim]) |
| `aggressive-tick` | `binance-aggressive-scalper` (LIMIT_MAKER, gate ATR, order-book — opt-in explicite) |
| `decide <PAIR>` | `binance-trading-skills` (BUY/SELL/HOLD argumenté via outils MCP Binance) |
| `scan` | scan multi-paires des scalpers |
| `status` | `_state/SESSIONS.md` + état des bandits |

## `tick` — procédure (sois bref)

1. Dans `.claude/skills/binance-trading/engines/binance-adaptive-scalper`, suivre la procédure tick de son `ENGINE.md`
   (mêmes principes que le scalper Alpaca : `run.mjs tick` → plan → exécution → record des fills).
2. Exécution du plan — chemin **recommandé** : le CLI write-side `node ../../cli/exec.mjs buy "<SYM>" --quote <N> [--limit <PX>]`
   (et `sell` / `cancel`). Il est **simulation-first** : sans `BINANCE_TRADING_ENABLED=true` + clés, il ne touche
   jamais l'API de trading (prix public + plan SIMULATED + `recordHint`). Le MCP Binance reste un fallback.
3. **MEAN-REVERSION** (oversold long / overbought short) — dans `.claude/skills/binance-trading/engines/binance-mean-reversion` :
   `node run.mjs tick "BTCUSDT,ETHUSDT,SOLUSDT,AVAXUSDT,LINKUSDT,LTCUSDT,BCHUSDT,DOGEUSDT,DOTUSDT,XRPUSDT,AAVEUSDT,UNIUSDT" 100000 brief`.
   Le contraire du scalper momentum (agit dans les extrêmes). Par item du plan :
   `BUY` (long) → `node ../../cli/exec.mjs buy "<SYM>" --quote <N> --limit <px>` puis `node run.mjs opened "<SYM>" long <fillPx> <fillQty>` ;
   `SHORT` → **SIMULATION SEULEMENT** (le spot Binance ne short pas) : juste `node run.mjs opened "<SYM>" short <px> <qty>`, aucun ordre réel ;
   `SELL`/`COVER` → long : `node ../../cli/exec.mjs sell "<SYM>" --qty <Q>` puis `node run.mjs closed "<SYM>" <fillPx>` ; cover sim : `node run.mjs closed "<SYM>" <px>`.
   Ne jamais sortir une position sans signal SELL/COVER du moteur.
4. Ledger : une ligne **uniquement si événement** (ordre/learn/erreur) — jamais de no-op.

## Exécution des ordres — CLI déterministe (recommandé)

Lectures/analyses → outils MCP Binance. Écritures (mécaniques) → CLI `.claude/skills/binance-trading/cli/exec.mjs`,
**simulation par défaut**, signé+réel seulement si `BINANCE_TRADING_ENABLED=true` ET `BINANCE_API_KEY`/`BINANCE_SECRET_KEY`
sont présents (mirroir exact de la posture du serveur MCP). Fee floor 0,10 %/fill.

```
node cli/exec.mjs price  <SYM>                               # prix public (toujours réel)
node cli/exec.mjs buy    <SYM> --quote <N> [--limit <PX>]    # SIMULATED tant que trading non activé
node cli/exec.mjs sell   <SYM> --qty   <Q> [--limit <PX>]
node cli/exec.mjs account | cancel <SYM> <ORDER_ID>          # signés (exigent enable+clés)
```

## Scheduling — MANUEL, par l'utilisateur

Identique à `alpaca-trading` : ce skill ne crée jamais de cron/routine lui-même. `/schedule`
distant = min 1 h et pas de MCP local ; cron in-session = 1 min possible mais vit avec la session.

## Règles

- Avantage structurel vs Alpaca crypto : fee floor ~0,20 % aller-retour (vs ~0,58 %) — un edge
  1-min y est plus plausible, mais reste à prouver sur données réelles avant tout déploiement.
- Verdict par défaut : ne pas trader. Le serveur MCP Binance doit tourner (`run-binance-mcp`).
