---
name: alpaca-charter
description: CHARTER — chart analyst for short term (1Min candles, ~24h window) and medium term (5Min candles, ~7d window) on Alpaca crypto AND US equities. Reads market STRUCTURE instead of firing indicator signals — swing highs/lows (zigzag), trend regime (HH/HL vs LH/LL), clustered support/resistance levels, volume profile (POC), RSI divergences, Bollinger squeeze, candle patterns — then emits a fee-aware trade plan (entry / invalidation / targets / R:R) where NO-TRADE is the default verdict. Use when asked to "analyse the chart", read levels, find support/resistance, judge a setup, or decide IF a trade is worth paying the fee floor at all. Pure analysis — places no orders. Pairs with the scalpers as their decision layer.
allowed-tools: Bash, Read
---

# CHARTER — lecture de graphique 1m + 5m, structure d'abord

Le skill qui répond à la leçon mesurée de ce repo : **le scalp mécanique 1-min perd contre le
plancher de frais** (bull BTC +52% → arm agressif −230%, arm sélectif −47%). Le problème n'est pas
l'indicateur, c'est le **ratio coût/mouvement** : l'aller-retour crypto Alpaca coûte ~0,58% quand
une bougie 1-min bouge ~0,05%. CHARTER renverse l'approche :

1. **Structure avant indicateurs** — on trade des *niveaux* (S/R testés, cassure-retest, extrêmes
   de range), pas des croisements d'EMA. Un niveau donne une invalidation *proche* et un objectif
   *loin* — c'est le seul moyen d'avoir un R:R qui paie le péage.
2. **Multi-timeframe** — le **5Min donne le biais et les niveaux** (moyen terme, ~7 jours), le
   **1Min ne sert qu'à timer l'entrée** (court terme, ~24h). Entrer au 1m sur un niveau 5m = petit
   stop pour un grand objectif.
3. **Filtre asymétrique dur** — un setup n'est `TRADEABLE` que si `objectif ≥ 3× fee floor` ET
   `R:R ≥ 2`. Sinon le verdict est **NO-TRADE — c'est le verdict par défaut.**
4. **Fee-aware par venue** — crypto Alpaca 0,58% / actions US 0,08% (le même setup peut être
   NO-TRADE en crypto et TRADEABLE sur SPY).

## Ce que `charter.mjs` calcule (déterministe, ~1 appel réseau par timeframe)

| Bloc | Méthode | Sert à |
|---|---|---|
| Swings | zigzag à seuil ATR-adaptatif | structure HH/HL vs LH/LL |
| Régime | 2 derniers swing-highs + 2 swing-lows | UPTREND / DOWNTREND / RANGE |
| Niveaux S/R | clustering des swings (tolérance 0,6×ATR), score = touches × récence | entrées, stops, objectifs |
| Profil volume | 30 bins de prix → POC + top nodes | aimants / zones de valeur |
| Divergences | RSI aux 2 derniers swings de même type | essoufflement de tendance |
| Squeeze | bande Bollinger vs percentile 100 barres | expansion imminente |
| Bougies | engulfing, pin/hammer, doji sur les dernières barres | trigger 1Min |
| Plan | support 5m le plus proche + ATR 1m → entry/stop/T1/T2, R:R, check frais | verdict TRADEABLE / NO-TRADE |

## Utilisation

```bash
cd .claude/skills/alpaca-trading/engines/alpaca-charter
node charter.mjs read "BTC/USD"          # lecture complète 2 timeframes + plan (JSON)
node charter.mjs read "SPY"              # actions US (IEX, nécessite ALPACA_API_KEY/SECRET en env)
node charter.mjs scan "BTC/USD,ETH/USD,SOL/USD,SPY,QQQ"   # un verdict par ligne
```

Claude interprète ensuite le JSON en **lecture de graphique** pour l'humain : régime par timeframe,
niveaux clés annotés (force, distance), confluences (niveau S/R ∩ POC ∩ divergence), le plan s'il
existe, et **pourquoi** le verdict est ce qu'il est. Toujours mentionner le fee floor utilisé.

## Comment le rendre (format de sortie attendu de Claude)

1. **Vue 5Min (moyen terme)** — régime, 2-3 niveaux majeurs au-dessus/en-dessous, POC, divergence.
2. **Vue 1Min (court terme)** — micro-régime, RSI, patterns de bougies récents, squeeze.
3. **Confluences** — où plusieurs blocs pointent le même prix.
4. **Plan** — si `TRADEABLE` : trigger, entrée, invalidation, T1/T2, R:R, taille suggérée
   (renvoyer vers `alpaca-risk-portfolio` pour le sizing). Si `NO-TRADE` : la raison chiffrée
   (objectif vs 3× frais, ou R:R < 2) et **ce qui devrait changer** pour que ça devienne tradeable.
5. Pas de recommandation d'ordre réel — analyse seulement (les scalpers / la trio exécutent).

## Gate des scalpers (intégration live)

`charter.mjs` exporte **`charterGate(sym)`** : les `tick` de `alpaca-adaptive-scalper` et
`alpaca-equity-scalper` l'appellent **avant toute entrée** — un BUY 1Min n'est exécuté que si la
structure 5Min est long-friendly (`UPTREND HH+HL`, ou stack EMA bullish avec pente > 0). Lazy (appelé
seulement quand un BUY se déclenche), **jamais sur les sorties** (un exit n'est jamais bloqué), et
**fail-closed** (erreur charter ⇒ pas d'entrée). Le plan du tick contient le verdict dans
`charterGate.reason` quand un BUY a été bloqué.

## Limites honnêtes

- Long-only book : un biais baissier ⇒ « rester flat », pas de short.
- Les niveaux viennent de la fenêtre chargée (24h en 1m, 7j en 5m) — un niveau majeur de 2024
  n'apparaîtra pas. Pour du plus long terme, utiliser `alpaca-momentum-2026` (daily).
- L'analyse ne crée pas d'edge à elle seule : elle **évite de payer des frais pour rien**. C'est
  déjà la majorité de la bataille à 1 minute.
- Hors marché (actions) : pas assez de barres 1Min récentes → erreur explicite, pas de fausse lecture.
