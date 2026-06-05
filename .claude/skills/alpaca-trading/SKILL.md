---
name: alpaca-trading
description: THE single Alpaca skill — runs ALL Alpaca strategies (paper only) from one place. Subcommands; start = launch the full multi-horizon autopilot (1-min in-session loop; tick every minute, trio hourly, momentum-2026 daily) — the ONE command to start everything; stop = end that loop; tick = one pass of the 1-min scalpers (crypto adaptive + US equity, every BUY charter-gated); hourly = the trend trio (regime-router -> trend-participation -> risk-portfolio); daily = momentum-2026 hold/cash allocation; all = one pass of the three horizons; chart <SYM> = charter structure read (1m+5m); scan = BUY-setup sweep; decide <PAIR> = ad-hoc BUY/SELL/HOLD; status = ledgers + positions. Use for ANY Alpaca trading request (start/run/launch/tick the strategy, analyse, allocate, status). Apart from the explicit start command, never create schedules. Engines live under this skill's engines/ subfolder (each has an ENGINE.md). For Binance use binance-trading.
allowed-tools: mcp__alpaca__*, Bash, Read, Write, Glob, Grep, CronCreate, CronDelete, CronList
---

# alpaca-trading — toutes les stratégies Alpaca, un seul skill

**Paper only, toujours.** Chaque sous-commande orchestre un moteur existant (le code et sa doc
détaillée restent dans le dossier du moteur — lire son `ENGINE.md` avant la première utilisation
d'une stratégie dans la session).

| Sous-commande | Horizon | Moteur (dossier sous `.claude/skills/`) |
|---|---|---|
| `tick` | 1 min | `alpaca-adaptive-scalper` (crypto) + `alpaca-equity-scalper` (actions) |
| `hourly` | 1 h | `alpaca-regime-router` → `alpaca-trend-participation` → `alpaca-risk-portfolio` |
| `daily` | 1 jour | `alpaca-momentum-2026` |
| `all` | les 3 | tick + hourly + daily enchaînés |
| `chart <SYM>` | analyse | `alpaca-charter` (`node charter.mjs read "<SYM>"`) |
| `scan` | analyse | charter `scan` + scalpers `scan` |
| `decide <PAIR>` | ad-hoc | `alpaca-crypto-trading` (BUY/SELL/HOLD argumenté) |
| `status` | — | ledgers `_state/SESSIONS.md`, positions MCP, arms actifs |
| `aggressive-tick` | 1 min | `alpaca-aggressive-scalper` (opt-in explicite seulement) |
| **`start`** | — | **lance l'autopilot multi-horizon** : boucle 1-min in-session (voir ci-dessous) |
| `stop` | — | supprime le job de boucle (CronList → CronDelete) ; ne liquide rien |

## `start` — démarrer TOUTES les stratégies en une commande

Quand l'utilisateur invoque `start`, créer (après CronList pour éviter un doublon) un job
**CronCreate** `*/1 * * * *`, `recurring: true`, avec EXACTEMENT ce prompt :

```
Alpaca-trading multi-horizon tick (be terse, ONE short line reply, never ask questions, PAPER only). Track horizon timestamps in .claude/skills/alpaca-trading/_state/last_runs.json (create if missing). EVERY tick: run the alpaca-trading SKILL.md `tick` procedure (crypto adaptive-scalper + equity-scalper, `node run.mjs tick ... 100000 brief`, execute charter-gated plans via mcp__alpaca paper orders, record fills, run learnHint if learnDue, ledger line ONLY on events). IF ≥60min since last "hourly": also run the `hourly` trio procedure (regime-router → trend-participation → risk-portfolio per their ENGINE.md), update timestamp. IF ≥24h since last "daily": also run the `daily` momentum-2026 allocation per its ENGINE.md, update timestamp. Never create schedules/crons; never close positions without an engine SELL signal.
```

Puis exécuter un premier passage immédiatement et rappeler : job session-only (meurt avec la
session, expire après 7 jours max) → relancer `/alpaca-trading start` à chaque session de trading.
C'est la SEULE situation où ce skill crée un cron — déclenchée par la commande explicite `start`.

## `tick` — la procédure exacte (sois bref, une ligne de réponse)

1. **CRYPTO** — dans `.claude/skills/alpaca-trading/engines/alpaca-adaptive-scalper` :
   `node run.mjs tick "BTC/USD,ETH/USD,SOL/USD,AVAX/USD,LINK/USD,LTC/USD,BCH/USD,DOGE/USD,DOT/USD,XRP/USD,AAVE/USD,UNI/USD" 100000 brief`
   Chaque item du plan (déjà charter-gated) : BUY → `mcp__alpaca place_crypto_order` (limit @price,
   notional du plan) puis `node run.mjs opened <SYM> <fillPx> <fillQty> <ARM>` ; SELL →
   `close_position` puis `node run.mjs closed <SYM> <fillPx>`. Si `learnDue`, exécuter le `learnHint`.
2. **EQUITY** — dans `.claude/skills/alpaca-trading/engines/alpaca-equity-scalper` :
   `node run.mjs tick "SPY,QQQ,IWM,GLD,SLV,USO,TLT,AAPL,MSFT,NVDA,AMZN,META" 100000 brief`
   Si `marketOpen=false` : passer silencieusement. Sinon exécuter le plan pareil
   (`place_stock_order`, limit, `time_in_force:"day"`) et enregistrer les fills.
3. **LEDGER** — une ligne dans le `_state/SESSIONS.md` concerné **uniquement si événement**
   (ordre, learn, erreur). Les ticks no-op ne sont JAMAIS loggés.

`brief` est obligatoire (sortie ~140 chars — c'est ce qui rend une boucle in-session viable).
Ne jamais outrepasser le plan : pas de BUY refusé par le charter-gate, pas de veto sur un exit.

## `hourly` / `daily` / `decide` — déférer aux moteurs

Lire l'`ENGINE.md` du moteur concerné et suivre sa procédure :
- `hourly` : router classe le régime (UP/CHOP/DOWN) → si UP, trend-participation donne le signal →
  risk-portfolio donne la taille. DOWN/CHOP = cash, c'est un résultat valide.
- `daily` : momentum-2026 → allocation hold/cash par actif (validé : bat le B&H de +30–48pp).
- `decide` : analyse ad-hoc fee-aware d'une paire via les outils MCP seulement.

## Scheduling — MANUEL, par l'utilisateur

Ce skill **ne crée jamais** de cron/routine/tâche lui-même. C'est l'utilisateur qui déclenche,
typiquement : `/schedule` (routines distantes Claude — min 1 h, pas d'accès au MCP local : OK pour
de l'analyse, pas pour passer des ordres) ou en demandant un cron in-session (1 min possible,
ordres OK, mais vit avec la session). Si on te demande de scheduler : rappelle ces limites, puis
laisse l'utilisateur choisir.

## Règles non négociables

- **PAPER uniquement** — jamais d'ordre hors compte paper.
- Verdict par défaut : **ne pas trader** (l'arm FLAT crypto et le NO-TRADE du charter sont des
  succès, pas des échecs — le fee floor crypto Alpaca est ~0,58 %).
- `stop`/arrêt ne liquide rien ; `close_all_positions` sur demande explicite seulement.
- Architecture : CHARTER (structure 5m) → bandit (trigger 1m) → fee floor (math) → ordre paper.
