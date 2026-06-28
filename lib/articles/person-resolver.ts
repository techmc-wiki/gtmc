/**
 * Unified person data layer for author-centric pages and features.
 *
 * Bridges three data sources:
 * - `people.yml` — person identities (peopleMention keys, social links, bios).
 * - `authors-alias.yml` + overrides — canonical manifest handles and their aliases.
 * - `author-profiles.json` — generated `peopleKey → canonicalManifestHandle` map.
 *
 * The manifest stores canonical git-derived handles (e.g. `Arcadi4`,
 * `hotpad100c`), while `people.yml` keys are the identity handles used in
 * `[@key]` markdown mentions (e.g. `4rcadia`, `Ryan100c`). This module
 * resolves from the manifest space back to the people space so page
 * consumers get a single, normalized `ResolvedPerson`.
 *
 * Server-safe: uses only `node:fs`, `js-yaml`, and sibling lib modules.
 * No React, no Next.js runtime APIs.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { load as yamlLoad } from "js-yaml"

import {
  type ArticleEntry,
  type ArticleLocale,
  loadArticleManifest,
} from "@/lib/articles/manifest"
import { resolvePerson, type ResolvedPerson } from "@/lib/markdown/people"

const CONFIG_DIR = join(process.cwd(), "lib", "articles", "config")
const MAINTAINERS_PATH = join(CONFIG_DIR, "maintainers.yml")
const ALIASES_PATH = join(CONFIG_DIR, "authors-alias.yml")
const ALIAS_OVERRIDES_PATH = join(CONFIG_DIR, "author-alias-overrides.yml")
const PROFILES_PATH = join(CONFIG_DIR, "author-profiles.json")

type AliasYaml = Record<string, string[]>

/** Locally resolved article summary for author pages. */
export interface AuthorArticleSummary {
  slug: string
  filePath: string
  title: string
  description: string
  locale: ArticleLocale
  author: string | undefined
  coAuthors: string[] | undefined
  index: number
  isAppendix: boolean
  isPreface: boolean
  isAdvanced: boolean | undefined
}

// --- module-level caches (process-scoped, matching people.ts convention) ---

let reverseAliasCache: Map<string, string> | null = null
let forwardAliasCache: Map<string, string> | null = null
let maintainersCache: Set<string> | null = null
let excludedAuthorsCache: Set<string> | null = null

/**
 * Build the forward alias map: every known spelling (canonical + aliases)
 * → canonical manifest handle. Same merge semantics as
 * `loadAuthorAliases()` in `lib/articles/git-metadata.ts`: auto-generated
 * first, then overrides take precedence (last-write-wins).
 *
 * Keys are stored lowercased for case-insensitive lookup. Returned canonical
 * values preserve their original casing from the YAML files.
 */
function getForwardAliasMap(): Map<string, string> {
  if (forwardAliasCache !== null) return forwardAliasCache

  const map = new Map<string, string>()
  const merge = (entries: AliasYaml | null | undefined): void => {
    if (!entries) return
    for (const [canonical, aliases] of Object.entries(entries)) {
      map.set(canonical.toLowerCase(), canonical)
      for (const alias of aliases) {
        map.set(alias.toLowerCase(), canonical)
      }
    }
  }

  try {
    merge(yamlLoad(readFileSync(ALIASES_PATH, "utf8")) as AliasYaml | null)
  } catch {
    // auto-generated aliases missing — non-fatal
  }
  try {
    merge(
      yamlLoad(readFileSync(ALIAS_OVERRIDES_PATH, "utf8")) as AliasYaml | null
    )
  } catch {
    // overrides optional
  }

  forwardAliasCache = map
  return map
}

/**
 * Build the reverse alias map: canonical manifest handle → people.yml key.
 *
 * Derived by inverting `author-profiles.json` (`peopleKey → canonical`).
 * Lookup is case-tolerant: the index is built lowercased and queries are
 * lowercased, but the returned peopleKey preserves its original casing from
 * the profiles file so `resolvePerson()` receives the exact people.yml key.
 */
function getReverseAliasMap(): Map<string, string> {
  if (reverseAliasCache !== null) return reverseAliasCache

  const map = new Map<string, string>()
  let profiles: Record<string, string>
  try {
    profiles = JSON.parse(
      readFileSync(PROFILES_PATH, "utf8")
    ) as Record<string, string>
  } catch {
    profiles = {}
  }

  for (const [peopleKey, canonical] of Object.entries(profiles)) {
    map.set(canonical.toLowerCase(), peopleKey)
  }

  reverseAliasCache = map
  return map
}

let peopleKeysCache: Map<string, string> | null = null
let peopleKeyToCanonicalCache: Map<string, string> | null = null

/**
 * Case-insensitive index of `people.yml` keys: lowercased key → original key.
 */
function getPeopleKeysLower(): Map<string, string> {
  if (peopleKeysCache !== null) return peopleKeysCache

  const keyToCanonical = getPeopleKeyToCanonical()
  const map = new Map<string, string>()
  for (const peopleKey of keyToCanonical.keys()) {
    map.set(peopleKey.toLowerCase(), peopleKey)
  }

  peopleKeysCache = map
  return map
}

/**
 * Direct `peopleKey → canonical` map from `author-profiles.json`,
 * preserving original key/value casing.
 */
function getPeopleKeyToCanonical(): Map<string, string> {
  if (peopleKeyToCanonicalCache !== null) return peopleKeyToCanonicalCache

  let profiles: Record<string, string>
  try {
    profiles = JSON.parse(
      readFileSync(PROFILES_PATH, "utf8")
    ) as Record<string, string>
  } catch {
    profiles = {}
  }

  const map = new Map<string, string>()
  for (const [peopleKey, canonical] of Object.entries(profiles)) {
    map.set(peopleKey, canonical)
  }

  peopleKeyToCanonicalCache = map
  return map
}

/**
 * Canonicalize a raw manifest author handle to its canonical manifest form.
 *
 * Resolution order:
 * 1. Forward alias map (case-insensitive) — covers aliased spellings.
 * 2. People-key case bridge — if the handle case-insensitively matches a
 *    known people key, resolve to that key's canonical manifest handle via
 *    `author-profiles.json`.
 * 3. Identity — unrecognized handles pass through unchanged (fallback authors).
 */
function canonicalizeHandle(handle: string): string {
  const forward = getForwardAliasMap()
  const fromForward = forward.get(handle.toLowerCase())
  if (fromForward) return fromForward

  const peopleKeysLower = getPeopleKeysLower()
  const peopleKey = peopleKeysLower.get(handle.toLowerCase())
  if (peopleKey) {
    const keyToCanonical = getPeopleKeyToCanonical()
    const canonical = keyToCanonical.get(peopleKey)
    if (canonical) return canonical
  }

  return handle
}

/**
 * Lowercased maintainer set (raw git usernames from `maintainers.yml`),
 * expanded with each maintainer's alias-resolved canonical form so that
 * both `4rcadia` (raw) and `Arcadi4` (canonical) are recognized.
 */
function getMaintainerSet(): Set<string> {
  if (maintainersCache !== null) return maintainersCache

  let raw: string[]
  try {
    const parsed = yamlLoad(readFileSync(MAINTAINERS_PATH, "utf8"))
    raw = Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    raw = []
  }

  const set = new Set<string>()
  const forward = getForwardAliasMap()
  for (const m of raw) {
    const lower = m.toLowerCase()
    set.add(lower)
    const resolved = forward.get(lower)
    if (resolved) set.add(resolved.toLowerCase())
  }

  maintainersCache = set
  return set
}

/**
 * The full exclusion set for `getUniqueAuthors`: maintainers (raw +
 * canonical) plus `gtmc-bot`. All lowercased for case-insensitive matching.
 */
function getExcludedAuthors(): Set<string> {
  if (excludedAuthorsCache !== null) return excludedAuthorsCache

  const set = new Set(getMaintainerSet())
  set.add("gtmc-bot")
  excludedAuthorsCache = set
  return set
}

function isExcludedAuthor(handle: string): boolean {
  return getExcludedAuthors().has(handle.toLowerCase())
}

/**
 * Resolve a manifest canonical author handle to a `ResolvedPerson`.
 *
 * - Handles that map back to a `people.yml` key (via the reverse alias map
 *   from `author-profiles.json`) return a full, non-fallback person.
 * - Handles with no known people entry return a fallback person
 *   (`isFallback: true`) so callers always get a usable display name.
 *
 * @example
 * resolveAuthorPerson("Arcadi4")    // → non-fallback 4rcadia person
 * resolveAuthorPerson("hotpad100c") // → non-fallback Ryan100c person
 * resolveAuthorPerson("Molforte")   // → non-fallback Molforte person (direct)
 * resolveAuthorPerson("Gudu-Z")     // → fallback
 */
export function resolveAuthorPerson(handle: string): ResolvedPerson {
  const canonical = canonicalizeHandle(handle)
  const reverse = getReverseAliasMap()
  const peopleKey = reverse.get(canonical.toLowerCase())

  if (peopleKey) {
    return resolvePerson(peopleKey)
  }

  // No known people entry — return a fallback so callers always get a name.
  return resolvePerson(canonical)
}

/**
 * Return sorted unique canonical author handles from the article manifest.
 *
 * Scans every non-folder entry's `author` and `coAuthors` fields. Excludes
 * maintainers (raw git usernames + their alias-resolved canonical forms)
 * and `gtmc-bot`. Output is sorted alphabetically for stable UI rendering.
 *
 * @param manifest Optional pre-loaded manifest (e.g. from `loadArticleManifest()`).
 *                 When omitted, the manifest is loaded from disk.
 */
export function getUniqueAuthors(
  manifest?: Record<string, ArticleEntry>
): string[] {
  const entries = manifest ?? loadArticleManifest()
  const authors = new Set<string>()

  for (const entry of Object.values(entries)) {
    if (entry.isFolder) continue

    if (entry.author) {
      const canonical = canonicalizeHandle(entry.author)
      if (!isExcludedAuthor(canonical)) {
        authors.add(canonical)
      }
    }

    if (entry.coAuthors) {
      for (const coAuthor of entry.coAuthors) {
        if (coAuthor) {
          const canonical = canonicalizeHandle(coAuthor)
          if (!isExcludedAuthor(canonical)) {
            authors.add(canonical)
          }
        }
      }
    }
  }

  return [...authors].toSorted((a, b) => a.localeCompare(b))
}

/**
 * Return localized article summaries for articles where `handle` is the
 * primary author or a co-author.
 *
 * The `handle` is treated as a canonical manifest handle. If the handle is
 * an alias rather than canonical (e.g. passed `4rcadia` instead of
 * `Arcadi4`), it is resolved through the forward alias map first so callers
 * can pass either form.
 *
 * @param handle  Canonical manifest author handle (or a known alias).
 * @param locale  Locale to localize `title` and `description` for.
 * @param manifest Optional pre-loaded manifest.
 */
export function getArticlesByAuthor(
  handle: string,
  locale: ArticleLocale,
  manifest?: Record<string, ArticleEntry>
): AuthorArticleSummary[] {
  const entries = manifest ?? loadArticleManifest()

  const canonical = canonicalizeHandle(handle)
  const matchKey = canonical.toLowerCase()

  const results: AuthorArticleSummary[] = []

  for (const entry of Object.values(entries)) {
    if (entry.isFolder) continue
    if (!entry.availableLocales.includes(locale)) continue

    const isAuthor =
      entry.author !== undefined &&
      canonicalizeHandle(entry.author).toLowerCase() === matchKey
    const isCoAuthor =
      entry.coAuthors?.some(
        (co) => canonicalizeHandle(co).toLowerCase() === matchKey
      ) ?? false

    if (!isAuthor && !isCoAuthor) continue

    results.push({
      slug: entry.slug,
      filePath: entry.filePath,
      title: entry.titleByLocale[locale]?.trim() || entry.slug,
      description: entry.descriptionByLocale[locale]?.trim() || "",
      locale,
      author: entry.author,
      coAuthors: entry.coAuthors,
      index: entry.index,
      isAppendix: entry.isAppendix,
      isPreface: entry.isPreface,
      isAdvanced: entry.isAdvanced,
    })
  }

  return results.toSorted((a, b) => {
    if (a.index !== b.index) return a.index - b.index
    return a.slug.localeCompare(b.slug)
  })
}
