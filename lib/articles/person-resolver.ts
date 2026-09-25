/**
 * Resolves identities between `people.yml` mention keys and canonical manifest
 * handles. Config resolution is server-only because it reads from disk.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { load as yamlLoad } from "js-yaml"

import {
  type ArticleEntry,
  type ArticleLocale,
  loadArticleManifest,
} from "@/lib/articles/manifest"
import {
  listPeopleKeys,
  resolvePerson,
  type ResolvedPerson,
} from "@/lib/markdown/people"

const CONFIG_DIR = join(process.cwd(), "lib", "articles", "config")
const MAINTAINERS_PATH = join(CONFIG_DIR, "maintainers.yml")
const ARTICLE_EDIT_EXCLUSIONS_PATH = join(
  CONFIG_DIR,
  "article-edit-exclusions.yml"
)
const ALIASES_PATH = join(CONFIG_DIR, "authors-alias.yml")
const ALIAS_OVERRIDES_PATH = join(CONFIG_DIR, "author-alias-overrides.yml")

type AliasYaml = Record<string, string[]>

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


let reverseAliasCache: Map<string, string> | null = null
let forwardAliasCache: Map<string, string> | null = null
let maintainersCache: Set<string> | null = null
let maintainerHandlesCache: string[] | null = null
let articleEditExclusionsCache: Set<string> | null = null

/**
 * Lowercases alias keys for case-insensitive lookup while preserving canonical
 * casing from the YAML files.
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
  } catch {}
  try {
    merge(
      yamlLoad(readFileSync(ALIAS_OVERRIDES_PATH, "utf8")) as AliasYaml | null
    )
  } catch {}

  forwardAliasCache = map
  return map
}

/**
 * Maps canonical manifest handles back to their exact `people.yml` keys using
 * case-insensitive lookup.
 */
function getReverseAliasMap(): Map<string, string> {
  if (reverseAliasCache !== null) return reverseAliasCache

  const map = new Map<string, string>()
  for (const [peopleKey, canonical] of getPeopleKeyToCanonical()) {
    map.set(canonical.toLowerCase(), peopleKey)
  }

  reverseAliasCache = map
  return map
}

let peopleKeysCache: Map<string, string> | null = null
let peopleKeyToCanonicalCache: Map<string, string> | null = null

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
 * Resolves each `people.yml` key through the alias map, falling back to the key
 * itself while preserving the original key and canonical casing.
 */
function getPeopleKeyToCanonical(): Map<string, string> {
  if (peopleKeyToCanonicalCache !== null) return peopleKeyToCanonicalCache

  const forward = getForwardAliasMap()
  const map = new Map<string, string>()
  for (const peopleKey of listPeopleKeys()) {
    map.set(peopleKey, forward.get(peopleKey.toLowerCase()) ?? peopleKey)
  }

  peopleKeyToCanonicalCache = map
  return map
}

/**
 * Resolves a manifest handle through aliases, then the case-insensitive people-key
 * bridge; unrecognized handles pass through unchanged.
 */
function canonicalizeHandle(handle: string): string {
  const normalized = handle.trim()
  const forward = getForwardAliasMap()
  const fromForward = forward.get(normalized.toLowerCase())
  if (fromForward) return fromForward

  const peopleKeysLower = getPeopleKeysLower()
  const peopleKey = peopleKeysLower.get(normalized.toLowerCase())
  if (peopleKey) {
    const keyToCanonical = getPeopleKeyToCanonical()
    const canonical = keyToCanonical.get(peopleKey)
    if (canonical) return canonical
  }

  return normalized
}

/** Includes each maintainer under both their raw and alias-resolved identities. */
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
 * Excludes attribution identities and their canonical aliases. This policy is
 * independent of maintainer status.
 */
function getExcludedAuthors(): Set<string> {
  if (articleEditExclusionsCache !== null) return articleEditExclusionsCache

  let raw: string[]
  try {
    const parsed = yamlLoad(
      readFileSync(ARTICLE_EDIT_EXCLUSIONS_PATH, "utf8")
    )
    raw = Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    raw = []
  }

  const set = new Set<string>()
  const forward = getForwardAliasMap()
  for (const identity of raw) {
    const lower = identity.toLowerCase()
    set.add(lower)
    const resolved = forward.get(lower)
    if (resolved) set.add(resolved.toLowerCase())
  }

  articleEditExclusionsCache = set
  return set
}

function isExcludedAuthor(handle: string): boolean {
  return getExcludedAuthors().has(handle.toLowerCase())
}

export function isArticleAttributionExcluded(handle: string): boolean {
  return isExcludedAuthor(canonicalizeHandle(handle))
}

/**
 * Returns canonical human-maintainer handles that have public person profiles;
 * service accounts and unmatched maintainer entries are excluded.
 */
export function getMaintainerHandles(): string[] {
  if (maintainerHandlesCache !== null) return maintainerHandlesCache

  const reverse = getReverseAliasMap()
  const handles = new Map<string, string>()

  for (const maintainer of getMaintainerSet()) {
    const canonical = canonicalizeHandle(maintainer)
    const key = canonical.toLowerCase()

    if (key !== "gtmc-bot" && reverse.has(key)) {
      handles.set(key, canonical)
    }
  }

  maintainerHandlesCache = [...handles.values()].toSorted((a, b) =>
    a.localeCompare(b)
  )
  return maintainerHandlesCache
}

/** Resolves aliases case-insensitively while excluding service accounts. */
export function isMaintainer(handle: string): boolean {
  const canonical = canonicalizeHandle(handle)
  return (
    canonical.toLowerCase() !== "gtmc-bot" &&
    getMaintainerSet().has(canonical.toLowerCase())
  )
}

/**
 * Resolves a manifest handle to its full person profile, or a usable fallback
 * profile when no `people.yml` entry is known.
 */
export function resolveAuthorPerson(handle: string): ResolvedPerson {
  const canonical = canonicalizeHandle(handle)
  const reverse = getReverseAliasMap()
  const peopleKey = reverse.get(canonical.toLowerCase())

  if (peopleKey) {
    return resolvePerson(peopleKey)
  }

  return resolvePerson(canonical)
}

/**
 * Returns a people key's canonical handle only when that handle has a public
 * author or maintainer profile route.
 */
export function getAuthorProfileHandle(peopleKey: string): string | null {
  const canonical = getPeopleKeyToCanonical().get(peopleKey)
  if (!canonical) return null
  return resolveProfileHandle(canonical)
}

/**
 * Returns sorted canonical handles from non-folder article attribution, omitting
 * configured exclusions. An omitted manifest is loaded from disk.
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
 * Returns the union of public article-author and maintainer handles. The two
 * role sets remain independent.
 */
export function getProfileHandles(
  manifest?: Record<string, ArticleEntry>
): string[] {
  const handles = new Map<string, string>()

  for (const handle of [
    ...getUniqueAuthors(manifest),
    ...getMaintainerHandles(),
  ]) {
    handles.set(handle.toLowerCase(), handle)
  }

  return [...handles.values()].toSorted((a, b) => a.localeCompare(b))
}

/**
 * Resolves a profile URL handle or alias to a canonical public profile handle.
 */
export function resolveProfileHandle(
  handle: string,
  manifest?: Record<string, ArticleEntry>
): string | null {
  const canonical = canonicalizeHandle(handle)
  return (
    getProfileHandles(manifest).find(
      (profileHandle) =>
        profileHandle.toLowerCase() === canonical.toLowerCase()
    ) ?? null
  )
}

/** Compares author handles after case-insensitive alias resolution. */
export function isSameAuthor(first: string, second: string): boolean {
  return (
    canonicalizeHandle(first).toLowerCase() ===
    canonicalizeHandle(second).toLowerCase()
  )
}

/**
 * Returns localized summaries where the input handle matches a primary or
 * co-author, accepting either a canonical manifest handle or a known alias.
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
