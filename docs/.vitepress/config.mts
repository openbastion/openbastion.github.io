import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const contentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Libellés de navigation, un par dossier de la documentation. */
const SECTIONS = [
  { dir: 'architecture', label: 'Architecture', collapsed: false },
  { dir: 'security', label: 'Sécurité', collapsed: false },
  { dir: 'deployment', label: 'Déploiement', collapsed: false },
  { dir: 'administration', label: 'Administration', collapsed: false },
  { dir: 'user-guide', label: 'Guide utilisateur', collapsed: false },
  { dir: 'api', label: 'API', collapsed: true },
  { dir: 'adr', label: 'Décisions d’architecture (ADR)', collapsed: true },
  { dir: 'development', label: 'Développement', collapsed: true },
  { dir: 'operations', label: 'Exploitation', collapsed: true },
  { dir: 'compliance', label: 'Conformité', collapsed: true },
]

/**
 * Hôtes acceptés par le serveur de développement. En prévisualisation, la page est
 * servie par un proxy dont le nom varie (identifiant de sandbox) : on autorise donc
 * les sous-domaines déclarés par l'environnement. Hors prévisualisation, la liste
 * reste vide et Vite applique sa vérification par défaut.
 */
function previewHosts(): string[] {
  if (process.env.BASE44_PREVIEW_MODE !== '1') return []
  const sandboxDomain = process.env.BASE44_SANDBOX_HOST_DOMAIN
  const publicSuffix = process.env.BASE44_PUBLIC_HOST_SUFFIX
  return [
    sandboxDomain ? `.${sandboxDomain}` : undefined,
    // Le proxy de prévisualisation met le port dans le premier label du nom
    // (`3000-<sandbox>.…`) : ce n'est pas un sous-domaine du suffixe public.
    publicSuffix ? `3000-${publicSuffix}` : undefined,
  ].filter((host): host is string => Boolean(host))
}

/**
 * Recherche DocSearch (Algolia). Les identifiants viennent de l'environnement :
 * `ALGOLIA_APP_ID`, `ALGOLIA_API_KEY` (clé de recherche publique, en lecture
 * seule) et `ALGOLIA_INDEX_NAME`. Les trois sont requis par DocSearch ; s'il en
 * manque un (construction locale, intégration continue), la recherche locale de
 * VitePress prend le relais pour que le site reste utilisable.
 */
const algoliaSearch = (() => {
  const { ALGOLIA_APP_ID: appId, ALGOLIA_API_KEY: apiKey, ALGOLIA_INDEX_NAME: indexName } =
    process.env
  if (!appId || !apiKey || !indexName) return null
  return { appId, apiKey, indexName }
})()

/** Recherche locale de VitePress, utilisée tant que DocSearch n'est pas configuré. */
const localSearch = {
  provider: 'local' as const,
  options: {
    translations: {
      button: { buttonText: 'Rechercher', buttonAriaLabel: 'Rechercher' },
      modal: {
        noResultsText: 'Aucun résultat pour',
        resetButtonTitle: 'Effacer la recherche',
        footer: {
          selectText: 'pour ouvrir',
          navigateText: 'pour naviguer',
          closeText: 'pour fermer',
        },
      },
    },
  },
}

/** Le titre d'une page est son premier titre de niveau 1. */
function headingOf(file: string): string {
  const source = fs.readFileSync(file, 'utf8')
  const match = source.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : path.basename(file, '.md')
}

/** Pages d'un dossier, la page d'index en tête, le gabarit d'ADR exclu. */
function itemsOf(dir: string) {
  const absolute = path.join(contentRoot, dir)
  return fs
    .readdirSync(absolute)
    .filter((file) => file.endsWith('.md') && file !== 'template.md')
    .sort((a, b) => (a === 'index.md' ? -1 : b === 'index.md' ? 1 : a.localeCompare(b)))
    .map((file) => ({
      text: headingOf(path.join(absolute, file)),
      link: `/${dir}/${file === 'index.md' ? '' : file.replace(/\.md$/, '')}`,
    }))
}

export default withMermaid(
  defineConfig({
    lang: 'fr-FR',
    title: 'OpenBastion',
    description:
      'Documentation du PAM open source OpenBastion : accès à privilèges proxifiés, enregistrés et audités.',
    cleanUrls: true,
    lastUpdated: true,
    head: [
      ['meta', { name: 'theme-color', content: '#0f766e' }],
      ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ],
    vite: {
      server: { allowedHosts: previewHosts() },
      // Mermaid est chargé à la demande : sans pré-groupement, certaines de ses
      // dépendances CommonJS (fastdom) sont servies brutes et cassent le rendu.
      optimizeDeps: { include: ['mermaid', 'fastdom'] },
    },
    themeConfig: {
      nav: [
        { text: 'Documentation', link: '/documentation' },
        { text: 'Architecture', link: '/architecture/' },
        { text: 'Sécurité', link: '/security/' },
        { text: 'Déploiement', link: '/deployment/' },
        { text: 'ADR', link: '/adr/' },
      ],
      sidebar: [
        {
          text: 'Démarrage',
          items: [
            { text: 'Documentation', link: '/documentation' },
            { text: headingOf(path.join(contentRoot, 'roadmap.md')), link: '/roadmap' },
          ],
        },
        ...SECTIONS.map(({ dir, label, collapsed }) => ({
          text: label,
          collapsed,
          items: itemsOf(dir),
        })),
      ],
      search: algoliaSearch
        ? { provider: 'algolia', options: algoliaSearch }
        : localSearch,
      socialLinks: [{ icon: 'github', link: 'https://github.com/openbastion/openbastion' }],
      outline: { label: 'Sur cette page', level: [2, 3] },
      docFooter: { prev: 'Page précédente', next: 'Page suivante' },
      lastUpdated: { text: 'Dernière mise à jour le' },
      sidebarMenuLabel: 'Menu',
      returnToTopLabel: 'Revenir en haut',
      darkModeSwitchLabel: 'Apparence',
      langMenuLabel: 'Changer de langue',
    },
    mermaid: { theme: 'neutral' },
  })
)
