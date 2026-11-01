# AGENTS.md

## Ce que contient ce dépôt

Site de documentation statique (VitePress, français). Le contenu de `docs/` est **copié** depuis le dépôt `openbastion/openbastion` ; seuls `docs/index.md`, `docs/public/` et `docs/.vitepress/` sont écrits ici. Ne pas corriger une page copiée sur place sans reporter la correction en amont : la prochaine synchronisation l'écraserait.

## Lancer et vérifier

```bash
docker compose -f docker-compose.base44.yml up -d
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/   # 200
```

Le conteneur exécute `npm ci` à chaque démarrage (`node_modules` sur un volume nommé) : compter ~20 s avant que le serveur de développement réponde. Vérification de la compilation statique : `docker compose … exec -T docs npm run docs:build` — c'est aussi le contrôle des liens morts, il doit passer avant toute publication.

## Contrôles automatiques

`npm run docs:check` (dans le conteneur, ou avec Node 22) exécute les deux contrôles de la CI `.github/workflows/docs.yml`, sur chaque `push` vers `main` et chaque `pull_request` :

- `scripts/check-docs-markdown.mjs` : front matter fermé et valeurs contenant `: ` citées, blocs de code fermés, un seul titre de niveau 1 sauf `layout: home`, pas de saut de niveau, aucun marqueur de conflit Git, pas d'espace en fin de ligne, retour à la ligne final ;
- `scripts/check-docs-links.mjs` : liens relatifs, liens absolus du site et fragments `#ancre` (slugs de titres calculés comme VitePress). Les liens externes ne sont pas ouverts.

Les deux sortent en code 1 avec la liste `fichier:ligne — problème`. Le job lance ensuite `npm run docs:build`, dont l'échec sur lien mort reste la seconde barrière. Les actions sont épinglées par empreinte (ADR-0047).

## Pièges rencontrés

- VitePress attend `index.md` comme page de dossier, la documentation amont utilise `README.md`. `scripts/sync-docs.sh` renomme les fichiers et réécrit les liens ; sans cela 33 liens de section cassent.
- Le front matter YAML de `docs/index.md` doit mettre entre guillemets toute valeur contenant `: ` — sinon le serveur refuse de démarrer (`incomplete explicit mapping pair`).
- Mermaid : `vitepress-plugin-mermaid` n'ajoute pas `mermaid` ni `fastdom` à `optimizeDeps`. Sans `optimizeDeps: { include: ['mermaid', 'fastdom'] }`, `fastdom` est servi brut en CommonJS et **l'application entière reste blanche**. Le message `Failed to resolve dependency: debug` au démarrage est béninois.
- Navigation SPA : `history.pushState` seul ne réveille pas le routeur VitePress. Pour vérifier une route, cliquer un lien réel (`a.VPNavBarMenuLink[href="/adr/"]`, `a[href$="system-overview"]`) puis attendre le texte du `h1` : `location.pathname` change avant le rendu, donc une assertion sur l'URL seule peut valider la page précédente.
- La navigation latérale est générée depuis les dossiers de `docs/` et le premier titre de niveau 1 de chaque page : une page ajoutée apparaît sans retoucher `config.mts`.

## Aperçu Base44 (sandbox)

`BASE44_PREVIEW_MODE`, `BASE44_SANDBOX_HOST_DOMAIN` et `BASE44_PUBLIC_HOST_SUFFIX` sont transmis au service par Compose. Quand `BASE44_PREVIEW_MODE` vaut exactement `"1"`, `docs/.vitepress/config.mts` ajoute à `server.allowedHosts` le sous-domaine de `BASE44_SANDBOX_HOST_DOMAIN` et l'hôte exact `3000-<BASE44_PUBLIC_HOST_SUFFIX>` — le proxy met le port dans le premier label du nom, ce n'est donc pas un sous-domaine du suffixe public. Variable absente ou valeur différente : la liste reste vide, ce qui laisse la vérification par défaut de Vite (localhost et loopback seulement), soit le comportement d'origine.

## Recherche (DocSearch)

`docs/.vitepress/config.mts` lit `ALGOLIA_APP_ID`, `ALGOLIA_API_KEY` et `ALGOLIA_INDEX_NAME` dans l'environnement du serveur (ou de la construction). Les trois ensemble activent DocSearch ; s'il en manque une, `localSearch` (recherche locale de VitePress, libellés français) prend le relais — c'est le cas en CI et dans un clone sans secrets. Compose transmet `/run/base44/app.env` (`env_file`, facultatif) : ces valeurs sont des secrets de l'application, jamais dans le dépôt. Vérifier le chemin DocSearch sans identifiants réels : `ALGOLIA_APP_ID=a ALGOLIA_API_KEY=b ALGOLIA_INDEX_NAME=c npm run docs:build` doit construire le site (le config n'est validé que par la construction).

## Synchroniser

`./scripts/sync-docs.sh` reprend `docs/` du dépôt amont, applique les transformations (index, liens sortants vers GitHub) et remplace les sections ; `docs/index.md`, `docs/public/` et `docs/.vitepress/` sont conservés. `--dry-run` simule, `--force` écrase les retouches locales.

Le script ne remplace plus les pages en aveugle : `scripts/sync-docs.manifest` (empreintes de la dernière synchronisation) est l'état de référence et doit être commité avec le résultat. Une retouche locale seule est conservée ; retouche locale et évolution amont donnent une fusion `git merge-file` sur la version du commit qui a enregistré le manifeste, avec marqueurs de conflit et code retour 1 en cas de chevauchement. Corollaire : si le manifeste est modifié sans être commité, la base de fusion est introuvable et la page part en conflit — committer la synchronisation avant de retoucher une page.
