# openbastion.github.io

Site de documentation publique [OpenBastion](https://github.com/openbastion/openbastion) : PAM open source, cloud-native, écrit en Go.

Le contenu des pages provient du dossier `docs/` du dépôt principal et est rendu par [VitePress](https://vitepress.dev) (Markdown, recherche DocSearch ou locale, diagrammes Mermaid).

## Lancer le site

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

Le site est servi sur <http://localhost:3000>. Les modifications de `docs/` sont appliquées à chaud.

Dans l'aperçu Base44, le service accepte l'hôte du proxy uniquement lorsque `BASE44_PREVIEW_MODE=1` (voir `docs/.vitepress/config.mts`) ; sans ce drapeau, Vite garde sa vérification d'hôte par défaut.

Sans Docker (Node.js 22) :

```bash
npm ci
npm run docs:dev      # http://localhost:5173
npm run docs:build    # sortie statique dans docs/.vitepress/dist
```

## Structure

| Chemin | Contenu |
|---|---|
| `docs/index.md` | Page d'accueil du site (écrite ici, pas en amont) |
| `docs/documentation.md` | Index de la documentation, par public et par section |
| `docs/*/` | Documentation du projet, copiée depuis `openbastion/openbastion` |
| `docs/.vitepress/` | Configuration du site : navigation, recherche, thème |

## Vérifier

```bash
npm run docs:check       # conformité Markdown + liens internes
npm run docs:build       # construction statique, échoue aussi sur un lien mort
```

`npm run docs:check` enchaîne deux contrôles, également exécutés par la CI
(`.github/workflows/docs.yml`) sur chaque `push` vers `main` et chaque
`pull_request` :

- `docs:check:markdown` (`scripts/check-docs-markdown.mjs`) : front matter fermé et
  correctement cité, blocs de code fermés, un seul titre de niveau 1 (il alimente la
  navigation), pas de saut de niveau, pas de marqueur de conflit Git, pas d’espace en
  fin de ligne ;
- `docs:check:links` (`scripts/check-docs-links.mjs`) : chaque lien interne mène à une
  page ou un fichier existant, et chaque fragment `#ancre` à un titre présent. Les
  liens externes ne sont pas ouverts.

## Recherche

La recherche est fournie par [DocSearch](https://docsearch.algolia.com/) (Algolia)
dès que les trois variables d’environnement sont présentes au démarrage du serveur
(ou de la construction) :

| Variable | Rôle |
|---|---|
| `ALGOLIA_APP_ID` | Identifiant de l’application DocSearch |
| `ALGOLIA_API_KEY` | Clé de recherche publique, en lecture seule |
| `ALGOLIA_INDEX_NAME` | Nom de l’index de la documentation |

Dans l’aperçu Base44, ces valeurs sont des secrets de l’application, livrés par la
plateforme dans `/run/base44/app.env` et lus par Compose. Si l’une des trois manque,
`docs/.vitepress/config.mts` retombe sur la recherche locale de VitePress : le site
reste utilisable, y compris en intégration continue.

## Synchroniser avec le dépôt principal

```bash
./scripts/sync-docs.sh              # synchronise
./scripts/sync-docs.sh --dry-run    # affiche les actions sans rien écrire
./scripts/sync-docs.sh --force      # miroir strict : écrase les retouches locales
```

Le script clone `openbastion/openbastion`, reprend son dossier `docs/` et réapplique les deux transformations nécessaires au site : les pages d'index `README.md` deviennent des `index.md`, et les rares liens sortant du dossier `docs/` (comme `NOTES_SANDBOX.md`) pointent vers GitHub. `docs/index.md`, `docs/public/` et `docs/.vitepress/` ne sont jamais touchés.

`scripts/sync-docs.manifest` garde l'empreinte de chaque page telle que l'a laissée la dernière synchronisation : c'est l'état de référence des fusions, à committer avec le résultat de la synchronisation. Le script s'en sert pour ne pas écraser de travail local :

- page inchangée ici : elle est remplacée par la version amont ;
- page retouchée ici, amont inchangé : elle est conservée et listée ;
- les deux ont changé : fusion à trois points ; sur un chevauchement, des marqueurs `<<<<<<<` sont écrits dans la page et le script sort en code 1 ;
- page supprimée en amont : elle est retirée, sauf si elle a été retouchée ici (conservée et signalée).

Une retouche locale reste l'exception : le contenu appartient au dépôt principal, où la correction doit être reportée.

Après synchronisation, vérifier que `docs/.vitepress/config.mts` construit toujours sa navigation : elle est générée à partir des dossiers et des titres de niveau 1 des pages, donc une nouvelle page apparaît sans configuration supplémentaire.
