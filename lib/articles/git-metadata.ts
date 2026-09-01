import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { load as yamlLoad } from "js-yaml"

const execFileAsync = promisify(execFile)

const CONFIG_DIR = join(process.cwd(), "lib", "articles", "config")
const ARTICLE_EDIT_EXCLUSIONS_PATH = join(
  CONFIG_DIR,
  "article-edit-exclusions.yml"
)
const ALIASES_PATH = join(CONFIG_DIR, "authors-alias.yml")
const ALIAS_OVERRIDES_PATH = join(CONFIG_DIR, "author-alias-overrides.yml")

interface Commit {
  author: string
  committer: string
  coAuthors: string[]
}

export type GitPathCommit = {
  readonly revision: string
  readonly committedAt: string
}

export type TranslationProvenance = {
  readonly translatedFromRevision: string
  readonly latestOriginalRevision: string
  readonly commitLag: number
  readonly dayLag: number
}

type GitPathCommitRange = {
  readonly repoCwd: string
  readonly relPath: string
  readonly ancestorRevision: string
  readonly descendantRevision: string
}

const MILLISECONDS_PER_DAY = 86_400_000

// Cache stores various types (e.g., string[] for attribution exclusions, Map<string, string> for aliases,
// {author, coAuthors} for parsed commits, {created, lastmod} for dates, string for SHAs)
const cache = new Map<string, any>()

function getCacheKey(cwd: string, relPath: string, type: string): string {
  return `${cwd}:${relPath}:${type}`
}

/**
 * Git usernames from `lib/articles/config/article-edit-exclusions.yml`,
 * lowercased. Does NOT respect author aliases. Signature dropped the
 * former `articlesRepoCwd` param — config is website-owned now.
 */
export async function loadArticleEditExclusions(): Promise<string[]> {
  const cacheKey = "config:article-edit-exclusions"
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  try {
    const content = await readFile(ARTICLE_EDIT_EXCLUSIONS_PATH, "utf-8")
    const exclusions = (yamlLoad(content) as string[]) || []
    const lowercased = exclusions.map((identity) => identity.toLowerCase())
    cache.set(cacheKey, lowercased)
    return lowercased
  } catch {
    cache.set(cacheKey, [])
    return []
  }
}

/**
 * Map of every known spelling (canonical + aliases) to canonical username.
 * Auto-generated `authors-alias.yml` is merged first, then
 * `author-alias-overrides.yml` takes precedence. Signature dropped the
 * former `articlesRepoCwd` param — config is website-owned now.
 */
export async function loadAuthorAliases(): Promise<Map<string, string>> {
  const cacheKey = "config:aliases"
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  const aliasMap = new Map<string, string>()

  const mergeEntries = (
    entries: Record<string, string[]> | null | undefined
  ): void => {
    if (!entries) return
    for (const [canonical, aliasList] of Object.entries(entries)) {
      // Re-registering the canonical key and its aliases overrides any prior
      // mapping, which is exactly the precedence contract for the overrides file.
      aliasMap.set(canonical, canonical)
      for (const alias of aliasList) {
        aliasMap.set(alias, canonical)
      }
    }
  }

  try {
    const autoContent = await readFile(ALIASES_PATH, "utf-8")
    mergeEntries(yamlLoad(autoContent) as Record<string, string[]> | null)
  } catch {
    // Missing auto-generated aliases is non-fatal; overrides may still apply.
  }

  try {
    const overrideContent = await readFile(ALIAS_OVERRIDES_PATH, "utf-8")
    mergeEntries(yamlLoad(overrideContent) as Record<string, string[]> | null)
  } catch {
    // Overrides are optional.
  }

  cache.set(cacheKey, aliasMap)
  return aliasMap
}

export async function getArticleAuthors(
  repoCwd: string,
  relPath: string,
  excludedEditors: string[],
  aliases: Map<string, string>
): Promise<{ author: string; coAuthors: string[] }> {
  const cacheKey = getCacheKey(repoCwd, relPath, "authors")
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  try {
    const { stdout } = await execFileAsync(
      "git",
      [
        "log",
        "--follow",
        "--format=%an%x00%cn%x00%B%x00---COMMIT---",
        "--",
        relPath,
      ],
      { cwd: repoCwd, encoding: "utf-8" }
    )

    const commitBlocks = stdout.trim().split("---COMMIT---")
    const commits: Commit[] = []

    for (const block of commitBlocks) {
      const trimmed = block.trim()
      if (!trimmed) continue

      const parts = trimmed.split("\x00", 3)
      if (parts.length < 3) continue

      const author = parts[0].trim()
      const committer = parts[1].trim()
      const body = parts[2].trim()

      const coAuthors: string[] = []
      for (const line of body.split("\n")) {
        if (line.trim().startsWith("Co-authored-by:")) {
          let coAuthorRaw = line.replace("Co-authored-by:", "").trim()
          if (coAuthorRaw.includes("<")) {
            coAuthorRaw = coAuthorRaw.split("<")[0].trim()
          }
          if (coAuthorRaw) {
            coAuthors.push(coAuthorRaw)
          }
        }
      }

      commits.push({ author, committer, coAuthors })
    }

    if (commits.length === 0) {
      const result = { author: "", coAuthors: [] }
      cache.set(cacheKey, result)
      return result
    }

    const allCoauthorsSet = new Set<string>()
    for (const commit of commits) {
      for (const coauthor of commit.coAuthors) {
        allCoauthorsSet.add(coauthor)
      }
    }

    // Excluded editors must be recognized both by their raw git username
    // (e.g. `4rcadia`) AND by their alias-resolved canonical form (e.g. `Arcadi4`).
    // Without this, an excluded editor using an aliased username filters
    // through as the article author instead of being excluded.
    const excludedEditorsLower = new Set<string>()
    for (const editor of excludedEditors) {
      excludedEditorsLower.add(editor.toLowerCase())
      const resolved = aliases.get(editor)
      if (resolved) {
        excludedEditorsLower.add(resolved.toLowerCase())
      }
    }
    const isExcludedEditor = (name: string) => {
      const lower = name.toLowerCase()
      if (excludedEditorsLower.has(lower)) return true
      const resolved = aliases.get(name)
      return (
        resolved !== undefined &&
        excludedEditorsLower.has(resolved.toLowerCase())
      )
    }
    const resolve = (name: string) => aliases.get(name) || name

    const firstCommit = commits[commits.length - 1]
    const firstAuthor = resolve(firstCommit.author)

    const uniqueAuthorsRaw: string[] = []
    const seen = new Set<string>()
    for (const commit of commits) {
      if (!seen.has(commit.author)) {
        seen.add(commit.author)
        uniqueAuthorsRaw.push(commit.author)
      }
    }

    const seenResolved = new Set<string>()
    const uniqueAuthors: string[] = []
    for (const authorRaw of uniqueAuthorsRaw) {
      const resolved = resolve(authorRaw)
      if (!seenResolved.has(resolved)) {
        seenResolved.add(resolved)
        uniqueAuthors.push(resolved)
      }
    }

    const allCoauthorsResolved: string[] = []
    const seenCoauthors = new Set<string>()
    for (const coauthorRaw of allCoauthorsSet) {
      const resolved = resolve(coauthorRaw)
      if (!seenCoauthors.has(resolved)) {
        seenCoauthors.add(resolved)
        allCoauthorsResolved.push(resolved)
      }
    }

    const attributedAuthors = uniqueAuthors.filter((a) => !isExcludedEditor(a))
    const attributedCoauthors = allCoauthorsResolved.filter(
      (a) => !isExcludedEditor(a)
    )

    let result: { author: string; coAuthors: string[] }

    if (isExcludedEditor(firstAuthor)) {
      if (allCoauthorsResolved.length > 0) {
        const firstAuthorNew =
          allCoauthorsResolved[allCoauthorsResolved.length - 1]
        const coAuthorsList = allCoauthorsResolved.filter(
          (a) => a !== firstAuthorNew
        )
        const coAuthorsSet = new Set(coAuthorsList)
        for (const a of attributedAuthors) {
          if (a !== firstAuthorNew && !coAuthorsSet.has(a)) {
            coAuthorsSet.add(a)
            coAuthorsList.push(a)
          }
        }

        result = { author: firstAuthorNew, coAuthors: coAuthorsList }
      } else {
        if (attributedAuthors.length > 0) {
          const firstAuthorNew = attributedAuthors[0]
          const coAuthorsList = attributedAuthors.filter(
            (a) => a !== firstAuthorNew
          )
          result = { author: firstAuthorNew, coAuthors: coAuthorsList }
        } else {
          const firstAuthorNew =
            uniqueAuthors.length > 0
              ? uniqueAuthors[uniqueAuthors.length - 1]
              : ""
          result = { author: firstAuthorNew, coAuthors: [] }
        }
      }
    } else {
      if (attributedAuthors.length > 0) {
        const firstAuthorNew = attributedAuthors[attributedAuthors.length - 1]
        const coAuthorsList = attributedAuthors.filter(
          (a) => a !== firstAuthorNew
        )
        const coAuthorsSet = new Set(coAuthorsList)
        for (const a of attributedCoauthors) {
          if (!coAuthorsSet.has(a)) {
            coAuthorsSet.add(a)
            coAuthorsList.push(a)
          }
        }

        result = { author: firstAuthorNew, coAuthors: coAuthorsList }
      } else {
        if (attributedCoauthors.length > 0) {
          const firstAuthorNew =
            attributedCoauthors[attributedCoauthors.length - 1]
          const coAuthorsList = attributedCoauthors.filter(
            (a) => a !== firstAuthorNew
          )
          result = { author: firstAuthorNew, coAuthors: coAuthorsList }
        } else {
          const firstAuthorNew =
            uniqueAuthors.length > 0
              ? uniqueAuthors[uniqueAuthors.length - 1]
              : ""
          result = { author: firstAuthorNew, coAuthors: [] }
        }
      }
    }

    cache.set(cacheKey, result)
    return result
  } catch {
    const result = { author: "", coAuthors: [] }
    cache.set(cacheKey, result)
    return result
  }
}

export async function getArticleDates(
  repoCwd: string,
  relPath: string,
  excludedEditors: string[]
): Promise<{ created: string | null; lastmod: string | null }> {
  const cacheKey = getCacheKey(repoCwd, relPath, "dates")
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  try {
    const { stdout } = await execFileAsync(
      "git",
      ["log", "--follow", "--format=%aI%x09%an", "--", relPath],
      { cwd: repoCwd, encoding: "utf-8" }
    )

    const lines = stdout
      .trim()
      .split("\n")
      .filter((l) => l.trim())
    const dates: string[] = []
    const allDates: string[] = []
    const excludedEditorsSet = new Set(excludedEditors)

    for (const line of lines) {
      if (!line.includes("\t")) continue
      const [date, author] = line.split("\t", 2)
      allDates.push(date)
      if (!excludedEditorsSet.has(author)) {
        dates.push(date)
      }
    }

    let result: { created: string | null; lastmod: string | null }
    if (dates.length === 0) {
      if (allDates.length > 0) {
        result = {
          created: allDates[allDates.length - 1],
          lastmod: allDates[0],
        }
      } else {
        result = { created: null, lastmod: null }
      }
    } else {
      result = { created: dates[dates.length - 1], lastmod: dates[0] }
    }

    cache.set(cacheKey, result)
    return result
  } catch {
    const result = { created: null, lastmod: null }
    cache.set(cacheKey, result)
    return result
  }
}



export async function getLatestPathCommit(
  repoCwd: string,
  relPath: string,
  revision = "HEAD"
): Promise<GitPathCommit | null> {
  const { stdout } = await execFileAsync(
    "git",
    ["log", "-n", "1", "--format=%H%x00%cI", revision, "--", relPath],
    { cwd: repoCwd, encoding: "utf-8" }
  )
  const [commitRevision, committedAt] = stdout.trim().split("\x00", 2)
  if (!commitRevision || !committedAt) return null
  return { revision: commitRevision, committedAt }
}

export async function getPathCommitCount({
  repoCwd,
  relPath,
  ancestorRevision,
  descendantRevision,
}: GitPathCommitRange): Promise<number> {
  const { stdout } = await execFileAsync(
    "git",
    [
      "log",
      "--format=%H",
      `${ancestorRevision}..${descendantRevision}`,
      "--",
      relPath,
    ],
    { cwd: repoCwd, encoding: "utf-8" }
  )
  return stdout.split("\n").filter(Boolean).length
}

export async function getTranslationProvenance(
  repoCwd: string,
  translationRelPath: string,
  sourceRelPath: string
): Promise<TranslationProvenance | null> {
  try {
    const translationCommit = await getLatestPathCommit(
      repoCwd,
      translationRelPath
    )
    if (!translationCommit) return null

    const [translatedFromCommit, latestOriginalCommit] = await Promise.all([
      getLatestPathCommit(repoCwd, sourceRelPath, translationCommit.revision),
      getLatestPathCommit(repoCwd, sourceRelPath),
    ])
    if (!translatedFromCommit || !latestOriginalCommit) return null

    const commitLag = await getPathCommitCount({
      repoCwd,
      relPath: sourceRelPath,
      ancestorRevision: translatedFromCommit.revision,
      descendantRevision: "HEAD",
    })
    const latestOriginalTimestamp = Date.parse(latestOriginalCommit.committedAt)
    const translationTimestamp = Date.parse(translationCommit.committedAt)
    if (
      !Number.isFinite(latestOriginalTimestamp) ||
      !Number.isFinite(translationTimestamp)
    ) {
      return null
    }

    return {
      translatedFromRevision: translatedFromCommit.revision,
      latestOriginalRevision: latestOriginalCommit.revision,
      commitLag,
      dayLag: Math.max(
        0,
        Math.floor(
          (latestOriginalTimestamp - translationTimestamp) /
            MILLISECONDS_PER_DAY
        )
      ),
    }
  } catch (error) {
    if (error instanceof Error) return null
    throw error
  }
}

