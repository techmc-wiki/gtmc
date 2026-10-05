import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { load as yamlLoad } from "js-yaml"

const execFileAsync = promisify(execFile)

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

const cache = new Map<string, unknown>()

/**
 * Returns configured Git usernames in lowercase without resolving aliases.
 * Attribution filters expand these identities to canonical handles when needed.
 */
export async function loadArticleEditExclusions(
  configDir: string
): Promise<string[]> {
  const key = `exclusions:${configDir}`
  const cached = cache.get(key) as string[] | undefined
  if (cached) return cached

  try {
    const content = await readFile(
      join(configDir, "article-edit-exclusions.yml"),
      "utf-8"
    )
    const exclusions = ((yamlLoad(content) as string[]) || []).map((id) =>
      id.toLowerCase()
    )
    cache.set(key, exclusions)
    return exclusions
  } catch {
    cache.set(key, [])
    return []
  }
}

/**
 * Maps every canonical handle and alias to its canonical username. The
 * generated alias file is merged first, then optional overrides take precedence.
 */
export async function loadAuthorAliases(
  configDir: string
): Promise<Map<string, string>> {
  const key = `aliases:${configDir}`
  const cached = cache.get(key) as Map<string, string> | undefined
  if (cached) return cached

  const aliasMap = new Map<string, string>()
  const merge = (entries: Record<string, string[]> | null | undefined) => {
    if (!entries) return
    for (const [canonical, aliasList] of Object.entries(entries)) {
      aliasMap.set(canonical, canonical)
      for (const alias of aliasList) aliasMap.set(alias, canonical)
    }
  }

  try {
    const content = await readFile(
      join(configDir, "authors-alias.yml"),
      "utf-8"
    )
    merge(yamlLoad(content) as Record<string, string[]> | null)
  } catch {}

  try {
    const content = await readFile(
      join(configDir, "author-alias-overrides.yml"),
      "utf-8"
    )
    merge(yamlLoad(content) as Record<string, string[]> | null)
  } catch {}

  cache.set(key, aliasMap)
  return aliasMap
}

export async function getArticleAuthors(
  repoCwd: string,
  relPath: string,
  excludedEditors: string[],
  aliases: Map<string, string>
): Promise<{ author: string; coAuthors: string[] }> {
  const key = `authors:${repoCwd}:${relPath}`
  const cached = cache.get(key) as
    | { author: string; coAuthors: string[] }
    | undefined
  if (cached) return cached

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

    const commits: Commit[] = stdout
      .trim()
      .split("---COMMIT---")
      .filter(Boolean)
      .map((block) => {
        const parts = block.trim().split("\x00", 3)
        if (parts.length < 3) return null
        const coAuthors = parts[2]
          .split("\n")
          .filter((line) => line.trim().startsWith("Co-authored-by:"))
          .map((line) => {
            let name = line.replace("Co-authored-by:", "").trim()
            if (name.includes("<")) name = name.split("<")[0].trim()
            return name
          })
          .filter(Boolean)
        return {
          author: parts[0].trim(),
          committer: parts[1].trim(),
          coAuthors,
        }
      })
      .filter((c): c is Commit => c !== null)

    if (commits.length === 0) {
      const result = { author: "", coAuthors: [] }
      cache.set(key, result)
      return result
    }

    const resolve = (name: string) => aliases.get(name) || name
    const excludedLower = new Set(
      excludedEditors.flatMap((e) => [
        e.toLowerCase(),
        resolve(e).toLowerCase(),
      ])
    )
    const isExcluded = (name: string) => {
      const lower = name.toLowerCase()
      const resolvedLower = resolve(name).toLowerCase()
      return excludedLower.has(lower) || excludedLower.has(resolvedLower)
    }

    const seenAuthors = new Map<string, string>()
    for (const c of commits) {
      const resolved = resolve(c.author)
      if (!seenAuthors.has(resolved)) seenAuthors.set(resolved, c.author)
    }

    const seenCoauthors = new Map<string, string>()
    for (const c of commits) {
      for (const co of c.coAuthors) {
        const resolved = resolve(co)
        if (!seenCoauthors.has(resolved)) seenCoauthors.set(resolved, co)
      }
    }

    const authors = [...seenAuthors.keys()]
    const coauthors = [...seenCoauthors.keys()]
    const firstCommitAuthor = resolve(commits[commits.length - 1].author)

    const attributedAuthors = authors.filter((a) => !isExcluded(a))
    const attributedCoauthors = coauthors.filter((a) => !isExcluded(a))

    let primary: string
    let rest: string[]

    if (isExcluded(firstCommitAuthor)) {
      if (coauthors.length > 0) {
        primary = coauthors.at(-1) ?? ""
        rest = coauthors.filter((a) => a !== primary)
        for (const a of attributedAuthors) {
          if (a !== primary && !rest.includes(a)) rest.push(a)
        }
      } else if (attributedAuthors.length > 0) {
        primary = attributedAuthors[0]
        rest = attributedAuthors.filter((a) => a !== primary)
      } else {
        primary = authors.at(-1) ?? ""
        rest = []
      }
    } else if (attributedAuthors.length > 0) {
      primary = attributedAuthors.at(-1) ?? ""
      rest = attributedAuthors.filter((a) => a !== primary)
      for (const a of attributedCoauthors) {
        if (!rest.includes(a)) rest.push(a)
      }
    } else if (attributedCoauthors.length > 0) {
      primary = attributedCoauthors.at(-1) ?? ""
      rest = attributedCoauthors.filter((a) => a !== primary)
    } else {
      primary = authors.at(-1) ?? ""
      rest = []
    }

    const result = { author: primary, coAuthors: rest }
    cache.set(key, result)
    return result
  } catch {
    const result = { author: "", coAuthors: [] }
    cache.set(key, result)
    return result
  }
}

export async function getArticleDates(
  repoCwd: string,
  relPath: string,
  excludedEditors: string[]
): Promise<{ created: string | null; lastmod: string | null }> {
  const key = `dates:${repoCwd}:${relPath}`
  const cached = cache.get(key) as
    | { created: string | null; lastmod: string | null }
    | undefined
  if (cached) return cached

  try {
    const { stdout } = await execFileAsync(
      "git",
      ["log", "--follow", "--format=%aI%x09%an", "--", relPath],
      { cwd: repoCwd, encoding: "utf-8" }
    )

    const lines = stdout.trim().split("\n").filter(Boolean)
    const dates: string[] = []
    const allDates: string[] = []

    for (const line of lines) {
      const [date, author] = line.split("\t", 2)
      allDates.push(date)
      if (!excludedEditors.includes(author)) dates.push(date)
    }

    const result =
      dates.length > 0
        ? { created: dates[dates.length - 1], lastmod: dates[0] }
        : allDates.length > 0
          ? { created: allDates[allDates.length - 1], lastmod: allDates[0] }
          : { created: null, lastmod: null }

    cache.set(key, result)
    return result
  } catch {
    const result = { created: null, lastmod: null }
    cache.set(key, result)
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
