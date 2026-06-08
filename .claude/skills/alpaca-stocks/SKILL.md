---
name: alpaca-stocks
description: THE single Alpaca STOCKS skill — runs all Alpaca US equity/ETF strategies (paper only) from one place. Subcommands; start = launch the stocks autopilot (1-min in-session loop, market-hours gated); stop = end that loop; tick = one pass of the equity momentum scalper (every BUY charter-gated) PLUS the mean-reversion engine (oversold long / overbought short); scan = setup sweep; status = ledgers + positions. Universe = 3 indices (SPY, QQQ, IWM) + 13 actions (AAPL, MSFT, NVDA, AMZN, META, GOOGL, TSLA, AVGO, AMD, NFLX, GLD, SLV, TLT). Use for ANY Alpaca STOCKS/ETF request. Apart from the explicit start command, never create schedules. Engines live under this skill's engines/ subfolder (each has an ENGINE.md). For crypto use alpaca-crypto; for Binance use binance-trading.
allowed-tools: mcp__alpaca__*, Bash, Read, Write, Glob, Grep, CronCreate, CronDelete, CronList
---

# alpaca-stocks — toutes les stratégies actions/ETF Alpaca, un seul skill

**Paper only, toujours.** Actions & ETF US uniquement (gated heures de marché). Chaque sous-commande
orchestre un moteur existant — lire son `ENGINE.md` avant la première utilisation dans la session.
Pour la crypto → `alpaca-crypto`.

**Univers (16) — 3 indices + 13 actions :** `SPY,QQQ,IWM,AAPL,MSFT,NVDA,AMZN,META,GOOGL,TSLA,AVGO,AMD,NFLX,GLD,SLV,TLT`
(indices : SPY, QQQ, IWM ; actions/ETF : AAPL, MSFT, NVDA, AMZN, META, GOOGL, TSLA, AVGO, AMD, NFLX, GLD, SLV, TLT).

| Sous-commande | Moteur (dossier sous `engines/`) |
|---|---|
| `tick` | `alpaca-equity-scalper` (momentum 1-min, charter-gated) + `alpaca-mean-reversion` (oversold long / overbought short) |
| `scan` | scalper `scan` + mean-reversion `scan` |
| `status` | ledgers `_state/SESSIONS.md`, positions, arms actifs |
| **`start`** | **lance l'autopilot stocks** : boucle 1-min in-session (gated heures de marché) |
| `stop` | supprime le job de boucle (CronList → CronDelete) ; ne liquide rien |

> Pas d'horizon `hourly`/`daily` ici : le router de régime et momentum-2026 sont des stratégies
> **crypto** (sous `alpaca-crypto`). Ce skill est purement intraday actions.

## `start` — démarrer l'autopilot stocks

Quand l'utilisateur invoque `start`, créer (après CronList pour éviter un doublon) un job
**CronCreate** `*/1 * * * *`, `recurring: true`, avec EXACTEMENT ce prompt :

```
Alpaca-STOCKS tick (be terse, ONE short line reply, never ask questions, PAPER only). Run the alpaca-stocks SKILL.md `tick` procedure on the universe "SPY,QQQ,IWM,AAPL,MSFT,NVDA,AMZN,META,GOOGL,TSLA,AVGO,AMD,NFLX,GLD,SLV,TLT": (1) equity-scalper `node run.mjs tick "<universe>" 100000 brief` — if marketOpen=false skip silently, else execute charter-gated BUY/SELL plans via the CLI paper orders (tif day), record fills, run learnHint if learnDue; (2) mean-reversion `node run.mjs tick "<universe>" 100000 brief` — execute BUY(long)/SHORT/SELL/COVER via the CLI, record fills with opened/closed. Ledger a line ONLY on events. Never create schedules/crons; never close positions without an engine SELL/COVER signal; never place equity orders while the US market is closed (orders won't fill).
```

Puis exécuter un premier passage immédiatement et rappeler : job session-only (meurt avec la session,
expire après 7 jours) → relancer `/alpaca-stocks start` à chaque session. SEULE situation où ce skill
crée un cron.

## `tick` — la procédure exacte (sois bref, une ligne de réponse)

1. **MOMENTUM** — dans `engines/alpaca-equity-scalper` :
   `node run.mjs tick "SPY,QQQ,IWM,AAPL,MSFT,NVDA,AMZN,META,GOOGL,TSLA,AVGO,AMD,NFLX,GLD,SLV,TLT" 100000 brief`
   Si `marketOpen=false` : passer silencieusement. Sinon, par item (déjà charter-gated) :
   BUY → `node ../../cli/exec.mjs buy "<SYM>" --notional <N> --limit <price>` puis `node run.mjs opened <SYM> <fillPx> <fillQty> <ARM>` ;
   SELL → `node ../../cli/exec.mjs close "<SYM>"` puis `node run.mjs closed <SYM> <fillPx>`. Si `learnDue`, exécuter le `learnHint`.
2. **MEAN-REVERSION** (long ET short) — dans `engines/alpaca-mean-reversion` :
   `node run.mjs tick "SPY,QQQ,IWM,AAPL,MSFT,NVDA,AMZN,META,GOOGL,TSLA,AVGO,AMD,NFLX,GLD,SLV,TLT" 100000 brief`
   Le contraire du scalper (agit dans les extrêmes). Par item du plan :
   `BUY` (long) → `node ../../cli/exec.mjs buy "<SYM>" --notional <N> --limit <price>` puis `node run.mjs opened "<SYM>" long <fillPx> <fillQty>` ;
   `SHORT` → `node ../../cli/exec.mjs sell "<SYM>" --qty <Q> --limit <price>` puis `node run.mjs opened "<SYM>" short <fillPx> <fillQty>` ;
   `SELL`/`COVER` (sortie) → `node ../../cli/exec.mjs close "<SYM>"` puis `node run.mjs closed "<SYM>" <fillPx>`. Pas de charter-gate ici (contre-tendance assumée).
3. **LEDGER** — une ligne dans le `_state/SESSIONS.md` concerné **uniquement si événement** (ordre/learn/erreur). Jamais de no-op.

`brief` obligatoire. **Heures de marché** : ne jamais passer d'ordre actions quand le marché US est
fermé (les moteurs peuvent encore signaler ~20 min sur des barres fraîches mais rien ne s'exécute) ;
ne jamais sortir une position sans signal SELL/COVER du moteur.

## Exécution des ordres — CLI déterministe (recommandé)

Lectures/analyses → outils MCP `mcp__alpaca__*`. Écritures → CLI `cli/exec.mjs` (API REST **paper**,
`tif=day` auto pour les actions). Le MCP (`place_stock_order` / `close_position`) reste un fallback.

```
node cli/exec.mjs buy   "<SYM>" --notional <N> [--limit <PX>]   # achat (long) — tif day auto
node cli/exec.mjs sell  "<SYM>" --qty <Q>      [--limit <PX>]   # ouverture short / réduction long
node cli/exec.mjs close "<SYM>"  [--qty Q | --pct P]
node cli/exec.mjs positions | account | cancel <ID> | cancel-all
```

## Scheduling — MANUEL, par l'utilisateur

Hors `start`, ce skill ne crée jamais de cron. `/schedule` distant = min 1 h, pas d'ordres ; cron
in-session = 1 min, ordres OK pendant les heures de marché, vit avec la session.

## Règles non négociables

- **PAPER uniquement.**
- Verdict par défaut : **ne pas trader** (le NO-TRADE du charter et le FLAT du scalper sont des succès).
- Le short mean-reversion est du vrai short-selling actions (paper) — borné par stop/temps, mais
  risque réel ; laisser `node run.mjs review` accumuler des fills avant d'y croire.
- `stop`/arrêt ne liquide rien ; `close_all_positions` sur demande explicite seulement.
- Architecture momentum : CHARTER (structure 5m) → bandit (trigger 1m) → fee floor → ordre paper.
