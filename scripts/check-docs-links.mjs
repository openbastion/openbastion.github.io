#!/usr/bin/env node
/**
 * Vérifie que chaque lien interne des pages de `docs/` mène à une page ou un
 * fichier qui existe.
 *
 * Sont contrôlés : les liens relatifs (`./page.md`, `../dossier/`), les liens
 * absolus du site (`/securite/page`) et les fragments (`#titre`) lorsqu'ils
 * visent une page. Les liens externes ne sont pas ouverts : seule leur syntaxe
 * commune est ignorée.
 *
 * Utilisation : npm run docs:check:links
 * Code retour 1 dès qu'un lien est mort.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const docsRoot = path.join(repoRoot, 'docs')
const publicDir = path.join(docsRoot, 'public')
const SKIPPED_DIRS = new Set(['.vitepress', 'public', 'node_modules'])
const EXTERNAL = /^([a-z][a-z0-9+.-]*:|\/\/)/i

function pagesIn(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return SKIPPED_DIRS.has(entry.name) ? [] : pagesIn(full)
    return entry.name.endsWith('.md') ? [full] : []
  })
}

/** Route servie pour une page, `cleanUrls` activé : « docs/a/index.md » donne « /a ». */
function routeOf(file) {
  const relative = path.relative(docsRoot, file).split(path.sep).join('/')
  const route = relative.replace(/(^|\/)(index|README)\.md$/, '$1').replace(/\.md$/, '')
  return `/${route}`.replace(/\/$/, '') || '/'
}

/** Ancre produite par VitePress pour un titre (même règle que github-slugger). */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/[!'"#$%&()*+,./:;<=>?@[\\\]^`{|}~]/g, '')
    .replace(/\s+/g, '-')
}

/** Ancres d'une page : titres HTML transformés par VitePress, doublons suffixés. */
function anchorsOf(file) {
  const anchors = new Set()
  const seen = new Map()
  let fence = null
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (marker) {
      if (!fence) fence = marker[1][0]
      else if (marker[1][0] === fence) fence = null
      continue
    }
    if (fence) continue
    const heading = line.match(/^#{1,6}\s+(.+?)\s*$/)
    if (!heading) continue
    const explicit = heading[1].match(/\{#([^}]+)\}\s*$/)
    const slug = explicit ? explicit[1] : slugify(explicit ? heading[1].replace(/\{[^}]*\}\s*$/, '') : heading[1])
    const count = seen.get(slug) ?? 0
    seen.set(slug, count + 1)
    anchors.add(count === 0 ? slug : `${slug}-${count}`)
  }
  return anchors
}

function decode(target) {
  try {
    return decodeURIComponent(target)
  } catch {
    return target
  }
}

function exists(file) {
  return fs.existsSync(file)
}

const pages = pagesIn(docsRoot)
const routes = new Set(pages.map(routeOf))
const anchorsCache = new Map()
const anchorsFor = (file) => {
  if (!anchorsCache.has(file)) anchorsCache.set(file, anchorsOf(file))
  return anchorsCache.get(file)
}

const problems = []
const fail = (file, line, message) =>
  problems.push(`${path.relative(repoRoot, file)}:${line} — ${message}`)

/** Vérifie un lien et renvoie vrai s'il mène quelque part. */
function checkLink(file, line, raw, fragment) {
  const target = decode(raw)
  const anchor = fragment ? decode(fragment) : ''

  if (target.startsWith('/')) {
    const route = target.replace(/\/$/, '') || '/'
    const page = pages.find((candidate) => routeOf(candidate) === route)
    if (page) {
      if (anchor && !anchorsFor(page).has(anchor)) return fail(file, line, `ancre introuvable « #${anchor} » dans ${raw}`)
      return true
    }
    if (exists(path.join(publicDir, target))) return true
    return fail(file, line, `lien interne mort « ${raw} » (aucune page « ${route} »)`)
  }

  const absolute = path.normalize(path.join(path.dirname(file), target))
  if (exists(absolute)) {
    if (anchor && absolute.endsWith('.md') && !anchorsFor(absolute).has(anchor)) {
      return fail(file, line, `ancre introuvable « #${anchor} » dans ${raw}`)
    }
    return true
  }
  for (const index of ['index.md', 'README.md']) {
    if (exists(path.join(absolute, index))) return true
  }
  return fail(file, line, `lien interne mort « ${raw} »`)
}

let checked = 0
const files = new Map()

for (const file of pages) {
  const source = fs.readFileSync(file, 'utf8')
  const lines = source.split('\n')
  let fence = null

  lines.forEach((line, index) => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (marker) {
      if (!fence) fence = marker[1][0]
      else if (marker[1][0] === fence) fence = null
      return
    }
    if (fence) return

    for (const match of line.matchAll(/!?\[[^\]]*\]\(\s*([^)\s]+?)(?:\s+"[^"]*")?\s*\)/g)) {
      const raw = match[1]
      if (EXTERNAL.test(raw)) continue
      const [withoutQuery] = raw.split('?')
      const hashIndex = withoutQuery.indexOf('#')
      const target = hashIndex === -1 ? withoutQuery : withoutQuery.slice(0, hashIndex)
      const fragment = hashIndex === -1 ? '' : withoutQuery.slice(hashIndex + 1)
      if (!target && !fragment) continue
      checked += 1
      if (!target) {
        if (!anchorsFor(file).has(fragment)) fail(file, index + 1, `ancre introuvable « #${fragment} »`)
        return
      }
      files.set(file, (files.get(file) ?? 0) + 1)
      checkLink(file, index + 1, target, fragment)
    }
  })
}

if (problems.length > 0) {
  console.error(`✗ ${problems.length} lien(s) mort(s) sur ${checked} liens internes vérifiés :`)
  for (const problem of problems) console.error(`  ${problem}`)
  process.exitCode = 1
} else {
  console.log(`✓ ${checked} liens internes valides dans ${files.size} pages.`)
}
