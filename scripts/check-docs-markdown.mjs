#!/usr/bin/env node
/**
 * Contrôle de conformité des pages Markdown de `docs/`.
 *
 * Vérifie ce dont dépend le site : la page d'accueil est reconnue par son front
 * matter, le titre de niveau 1 alimente la navigation (`headingOf` dans
 * `config.mts`), les blocs de code sont fermés, et aucune page ne porte de
 * marqueur de conflit laissé par la fusion de `scripts/sync-docs.sh`.
 *
 * Utilisation : npm run docs:check:markdown
 * Code retour 1 dès qu'une page est non conforme.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const docsRoot = path.join(repoRoot, 'docs')
const SKIPPED_DIRS = new Set(['.vitepress', 'public', 'node_modules'])

/** Toutes les pages Markdown de `docs/`, hors configuration et fichiers publics. */
function pagesIn(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return SKIPPED_DIRS.has(entry.name) ? [] : pagesIn(full)
    return entry.name.endsWith('.md') ? [full] : []
  })
}

const problems = []
const fail = (file, line, message) =>
  problems.push(`${path.relative(repoRoot, file)}${line ? `:${line}` : ''} — ${message}`)

/** Le front matter doit être fermé et ses valeurs contenant « : » entre guillemets. */
function checkFrontMatter(file, lines) {
  const end = lines.indexOf('---', 1)
  if (end === -1) {
    fail(file, 1, 'front matter non fermé par une ligne « --- »')
    return { home: false, start: 0 }
  }
  for (let i = 1; i < end; i += 1) {
    const entry = lines[i].match(/^[A-Za-z][\w-]*:\s+(.+)$/)
    if (entry && entry[1].includes(': ') && !/^["'].*["']$/.test(entry[1].trim())) {
      fail(file, i + 1, 'front matter : valeur contenant « : » à mettre entre guillemets')
    }
  }
  return { home: /^layout:\s*home\s*$/m.test(lines.slice(1, end).join('\n')), start: end + 1 }
}

const pages = pagesIn(docsRoot)

for (const file of pages) {
  const source = fs.readFileSync(file, 'utf8')
  if (!source.trim()) {
    fail(file, 0, 'page vide')
    continue
  }
  if (!source.endsWith('\n')) fail(file, source.split('\n').length, 'pas de retour à la ligne final')

  const lines = source.replace(/\n$/, '').split('\n')
  let { home, start } = { home: false, start: 0 }
  if (lines[0] === '---') ({ home, start } = checkFrontMatter(file, lines))

  const titles = []
  let fence = null
  let previousLevel = 0

  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i]

    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (marker) {
      if (!fence) fence = { char: marker[1][0], length: marker[1].length, line: i + 1 }
      else if (marker[1][0] === fence.char && marker[1].length >= fence.length) fence = null
      continue
    }
    if (fence) continue

    if (/^(<{7}|={7}|>{7})(\s|$)/.test(line)) fail(file, i + 1, 'marqueur de conflit Git non résolu')
    if (/[ \t]+$/.test(line)) fail(file, i + 1, 'espace en fin de ligne')
    if (/\]\(\s*\)/.test(line)) fail(file, i + 1, 'lien sans destination')

    const heading = line.match(/^(#{1,6})\s+(\S.*?)\s*$/)
    if (!heading) continue
    const level = heading[1].length
    if (level === 1) titles.push(i + 1)
    if (previousLevel && level > previousLevel + 1) {
      fail(file, i + 1, `saut de niveau de titre h${previousLevel} → h${level}`)
    }
    previousLevel = level
  }

  if (fence) fail(file, fence.line, 'bloc de code non fermé')
  // La page d'accueil (layout: home) n'a pas de titre de niveau 1 : sa navigation est le hero.
  if (!home) {
    if (titles.length === 0) fail(file, 0, 'aucun titre de niveau 1 (il alimente la navigation)')
    else if (titles.length > 1) fail(file, titles[1], 'plusieurs titres de niveau 1')
  }
}

if (problems.length > 0) {
  console.error(`✗ ${problems.length} problème(s) dans ${pages.length} pages Markdown :`)
  for (const problem of problems) console.error(`  ${problem}`)
  process.exitCode = 1
} else {
  console.log(`✓ ${pages.length} pages Markdown conformes.`)
}
