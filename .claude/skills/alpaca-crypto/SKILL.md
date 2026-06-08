---
name: alpaca-crypto
description: THE single Alpaca CRYPTO skill — runs all Alpaca crypto strategies (paper only) from one place. Subcommands; start = launch the crypto multi-horizon autopilot (1-min in-session loop; tick every minute, trio hourly, momentum-2026 daily) — the ONE command to start everything crypto; stop = end that loop; tick = one pass of the 1-min crypto adaptive scalper (16 pairs, every BUY charter-gated); hourly = the trend trio (regime-router -> trend-participation -> risk-portfolio); daily = momentum-2026 hold/cash allocation; all = one pass of the three horizons; decide <PAIR> = ad-hoc BUY/SELL/HOLD; scan = BUY-setup sweep; status = ledgers + state; aggressive-tick = the aggressive scalper (opt-in). Use for ANY Alpaca CRYPTO request. Apart from the explicit start command, never create schedules. Engines live under this skill's engines/ subfolder (each has an ENGINE.md). For US stocks/ETFs use alpaca-stocks; for Binance use binance-trading.
allowed-tools: mcp__alpaca__*, Bash, Read, Write, Glob, Grep, CronCreate, CronDelete, CronList
---

# alpaca-crypto — toutes les stratégies crypto Alpaca, un seul skill

**Paper only, toujours.** Crypto uniquement (24/7). Chaque sous-commande orchestre un moteur existant
(le code et sa doc détaillée restent dans le dossier du moteur — lire son `ENGINE.md` avant la
première utilisation d'une stratégie dans la session). Pour les actions/ETF US → `alpaca-stocks`.

**Panier crypto (16 max) :** `BTC/USD,ETH/USD,SOL/USD,AVAX/USD,LINK/USD,LTC/USD,BCH/USD,DOGE/USD,DOT/USD,XRP/USD,AAVE/USD,UNI/USD,ADA/USD,ARB/USD,SHIB/USD,CRV/USD`

| Sous-commande | Horizon | Moteur (dossier sous `engines/`) |
|---|---|---|
| `tick` | 1 min | `alpaca-adaptive-scalper` (crypto, bandit auto-tuné, fee-aware ~0,58 %) |
| `hourly` | 1 h | `alpaca-regime-router` → `alpaca-trend-participation` → `alpaca-risk-portfolio` |
| `daily` | 1 jour | `alpaca-momentum-2026` |
| `all` | les 3 | tick + hourly + daily enchaînés |
| `decide <PAIR>` | ad-hoc | `alpaca-crypto-trading` (BUY/SELL/HOLD argumenté) |
| `scan` | analyse | scalper `scan` |
| `status` | — | ledgers `_state/SESSIONS.md`, positions, arms actifs |
| `aggressive-tick` | 1 min | `alpaca-aggressive-scalper` (opt-in explicite seulement) |
| **`start`** | — | **lance l'autopilot crypto multi-horizon** : boucle 1-min in-session |
| `stop` | — | supprime le job de boucle (CronList → CronDelete) ; ne liquide rien |

## `start` — démarrer l'autopilot crypto

Quand l'utilisateur invoque `start`, créer (après CronList pour éviter un doublon) un job
**CronCreate** `*/1 * * * *`, `recurring: true`, avec EXACTEMENT ce prompt :

```
Alpaca-CRYPTO multi-horizon tick (be terse, ONE short line reply, never ask questions, PAPER only). Track horizon timestamps in .claude/skills/alpaca-crypto/_state/last_runs.json (create if missing). EVERY tick: run the alpaca-crypto SKILL.md `tick` procedure (adaptive-scalper, `node run.mjs tick "BTC/USD,ETH/USD,SOL/USD,AVAX/USD,LINK/USD,LTC/USD,BCH/USD,DOGE/USD,DOT/USD,XRP/USD,AAVE/USD,UNI/USD,ADA/USD,ARB/USD,SHIB/USD,CRV/USD" 100000 brief`, execute charter-gated plans via the CLI paper orders, record fills, run learnHint if learnDue, ledger line ONLY on events). IF ≥60min since last "hourly": also run the `hourly` trio procedure (regime-router → trend-participation → risk-portfolio per their ENGINE.md), update timestamp. IF ≥24h since last "daily": also run the `daily` momentum-2026 allocation per its ENGINE.md, update timestamp. Never create schedules/crons; never close positions without an engine SELL signal.
```

Puis exécuter un premier passage immédiatement et rappeler : job session-only (meurt avec la
session, expire après 7 jours max) → relancer `/alpaca-crypto start` à chaque session de trading.
C'est la SEULE situation où ce skill crée un cron.

## `tick` — la procédure exacte (sois bref, une ligne de réponse)

Dans `engines/alpaca-adaptive-scalper` :
`node run.mjs tick "BTC/USD,ETH/USD,SOL/USD,AVAX/USD,LINK/USD,LTC/USD,BCH/USD,DOGE/USD,DOT/USD,XRP/USD,AAVE/USD,UNI/USD,ADA/USD,ARB/USD,SHIB/USD,CRV/USD" 100000 brief`
Chaque item du plan (déjà charter-gated) : BUY → **CLI recommandé** `node ../../cli/exec.mjs buy "<SYM>" --notional <N> --limit <price>`
puis `node run.mjs opened <SYM> <fillPx> <fillQty> <ARM>` ; SELL → `node ../../cli/exec.mjs close "<SYM>"`
puis `node run.mjs closed <SYM> <fillPx>`. Si `learnDue`, exécuter le `learnHint`.
**LEDGER** : une ligne dans `_state/SESSIONS.md` **uniquement si événement** (ordre/learn/erreur) — jamais de no-op.

`brief` est obligatoire. Ne jamais outrepasser le plan : pas de BUY refusé par le charter-gate, pas de veto sur un exit.

## `hourly` / `daily` / `decide` — déférer aux moteurs

- `hourly` : `alpaca-regime-router` classe le régime (UP/CHOP/DOWN) → si UP, `alpaca-trend-participation`
  donne le signal → `alpaca-risk-portfolio` donne la taille. DOWN/CHOP = cash (résultat valide).
  Mettre à jour `hourly` dans `_state/last_runs.json`.
- `daily` : `alpaca-momentum-2026` → allocation hold/cash par actif. Mettre à jour `daily`.
- `decide <PAIR>` : analyse ad-hoc fee-aware via `alpaca-crypto-trading`.

## Exécution des ordres — CLI déterministe (recommandé)

Lectures/analyses → outils MCP `mcp__alpaca__*`. Écritures → CLI `cli/exec.mjs` (tape l'API REST
**paper**, crypto `tif=gtc` auto). Le MCP (`place_crypto_order` / `close_position`) reste un fallback.

```
node cli/exec.mjs buy  "<SYM>" --notional <N> [--limit <PX>]   # crypto: slash auto-normalisé
node cli/exec.mjs close "<SYM>" [--qty Q | --pct P]
node cli/exec.mjs positions | account | cancel <ID> | cancel-all
```

## Scheduling — MANUEL, par l'utilisateur

Hors `start`, ce skill ne crée jamais de cron. `/schedule` distant = min 1 h, pas de MCP/CLI local
(OK analyse, pas d'ordres) ; cron in-session = 1 min, ordres OK, vit avec la session.

## Règles non négociables

- **PAPER uniquement.**
- Verdict par défaut : **ne pas trader** (l'arm FLAT crypto est un succès — fee floor Alpaca ~0,58 %).
- `stop`/arrêt ne liquide rien ; `close_all_positions` sur demande explicite seulement.
- Architecture : CHARTER (structure 5m) → bandit (trigger 1m) → fee floor (math) → ordre paper.
