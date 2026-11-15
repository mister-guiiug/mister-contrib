# mister-contrib

Consolide contributions et dépôts depuis plusieurs forges en un calendrier
public anonymisé, sans révéler les plateformes utilisées.

**→ https://mister-guiiug.github.io/mister-contrib/**

Application PWA de la famille `miss-*` / `mister-*`, née du squelette
[`pwa-starter-kit`](https://github.com/mister-guiiug/pwa-starter-kit) et bâtie
sur [`@mister-guiiug/dev-pwa-config`](https://github.com/mister-guiiug/dev-pwa-config).

## Ce que la page montre

- le nombre de **contributions** de l’année civile (même familles d’événements
  que les graphes GitHub / GitLab : issues, merge/pull requests, pushes,
  commentaires) ;
- le nombre de **dépôts touchés** (où une intervention a été mesurée) ;
- un **calendrier** (grille 7 × semaines) consolidé.

Elle **ne montre pas** quelles forges sont branchées, ni combien, ni aucune
URL de plateforme.

## Relevé

Le workflow [`.github/workflows/releve.yml`](.github/workflows/releve.yml) lit
le secret `SOURCES_JSON`, interroge chaque source, fusionne par jour, et
écrit `public/donnees.json` (anonymisé). Un commit sur `main` republie Pages.

### Secret `SOURCES_JSON`

À poser sur le dépôt (Settings → Secrets), jamais dans le code :

```json
{
  "sources": [
    { "kind": "github", "token": "ghp_…" },
    { "kind": "github", "baseUrl": "https://ghe.exemple", "token": "…" },
    { "kind": "gitlab", "baseUrl": "https://gitlab.com", "token": "…" },
    { "kind": "azuredevops", "org": "mon-org", "token": "…" },
    { "kind": "bitbucket", "workspace": "mon-ws", "token": "…" }
  ]
}
```

`kind` acceptés : `github`, `gitlab`, `azuredevops`, `bitbucket`. On peut
répéter un `kind` (plusieurs instances / plusieurs PAT).

Chaque PAT ne remonte que l’activité de **son titulaire** (jamais tout un
workspace ou une org). Plusieurs comptes → plusieurs sources, chacune avec
son jeton. Aucun login ne sort dans `donnees.json`.

Localement :

```bash
SOURCES_JSON='{"sources":[…]}' node scripts/releve.mjs
```

Les dépôts touchés sont **additionnés** entre sources (pas de déduplication
cross-forge : trop de fuite d’identité).

## Démarrer

```bash
npm install
npm run dev
```

L'installation lit le socle sur GitHub Packages : exporter `NODE_AUTH_TOKEN`
(un jeton avec `read:packages`) avant `npm install`.

## Vérifier

```bash
npm test
npm run build
```

## Licence

MIT — voir [LICENSE](./LICENSE).
