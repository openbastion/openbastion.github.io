# openbastion.github.io

Site de documentation publique [OpenBastion](https://github.com/openbastion/openbastion) : PAM open source, cloud-native, écrit en Go.

Le contenu des pages provient du dossier `docs/` du dépôt principal et est rendu par [VitePress](https://vitepress.dev) (Markdown, recherche locale, diagrammes Mermaid).

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

## Synchroniser avec le dépôt principal

```bash
./scripts/sync-docs.sh
```

Le script clone `openbastion/openbastion`, reprend son dossier `docs/` et réapplique les deux transformations nécessaires au site : les pages d'index `README.md` deviennent des `index.md`, et les rares liens sortant du dossier `docs/` (comme `NOTES_SANDBOX.md`) pointent vers GitHub. La page d'accueil `docs/index.md` n'est jamais écrasée.

Après synchronisation, vérifier que `docs/.vitepress/config.mts` construit toujours sa navigation : elle est générée à partir des dossiers et des titres de niveau 1 des pages, donc une nouvelle page apparaît sans configuration supplémentaire.
