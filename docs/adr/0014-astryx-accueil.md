# ADR 0014 — Accueil public sur Astryx (Meta)

- **Statut** : accepté
- **Date** : 2026-11-15

## Contexte

L'accueil de mister-contrib est la seule surface vraiment publique du dépôt.
Le socle `dev-pwa-config` / `data-dwc` reste adapté aux écrans famille
(réglages, compte), mais le calendrier anonymisé demandait une identité
visuelle propre, calquée sur [Astryx](https://astryx.atmeta.com/) (React 19,
StyleX, thèmes prêts).

## Décision

- **Accueil** (et son calendrier) : composants `@astryxdesign/core` + thème
  `butter` (tons chauds, accent bleu — proche du site marketing Astryx).
- **Autres routes** : inchangées, toujours peintes par `components.css` du
  socle et la barre basse `AppShell`.
- Pas de compilateur StyleX dans Vite tant qu'on n'écrit pas de
  `stylex.create()` ni de composants swizzlés : Astryx livre du CSS précompilé.
- L'accueil est un `lazy()` ; CSS Astryx importé depuis `astryx-themes.ts` ;
  imports par sous-chemin (`@astryxdesign/core/Card`, …), pas le barrel.

## Conséquences

- Dépendances runtime supplémentaires (`@astryxdesign/core`,
  `@astryxdesign/theme-butter`, `@stylexjs/stylex`) : le budget gzip est
  reposé après mesure (formule +10 %).
- Deux systèmes cohabitent volontairement : Astryx sur l'accueil, dwc ailleurs.
  Ne pas « unifier » en silencieux en peignant le socle aux tokens Astryx.
- `npx @astryxdesign/cli theme add …` régénère `src/astryx-themes.ts` :
  y reposer ensuite l'import de `reset.css` / `astryx.css` (hors générateur).

## Alternatives écartées

- Skin CSS seule (option A) : plus rapide, mais sans le système de composants
  ni les thèmes maintenus par Meta.
- Remplacer tout le shell famille par Astryx : casserait `pwa-doctor`
  (liens-famille, barre basse) et la cohérence du parc.
