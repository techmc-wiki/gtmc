import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { dump as yamlDump, load as yamlLoad } from "js-yaml"

import { resolveGithubToken } from "@/lib/github/tokens"
import { createLogger } from "./lib/logger"

const logger = createLogger("authors")

const CONFIG_DIR = join(process.cwd(), "lib", "articles", "config")
const OUTPUT_PATH = join(CONFIG_DIR, "authors-alias.yml")
const OVERRIDES_PATH = join(CONFIG_DIR, "author-alias-overrides.yml")

const ARTICLES_PATH =
  process.env.ARTICLES_PATH ?? join(process.cwd(), "articles")

const GITHUB_TOKEN = resolveGithubToken()

// Unauthenticated commit lookups work but consume GitHub's lower rate limit.
const GITHUB_API_BASE = "https://api.github.com"
const GITHUB_ARTICLES_REPO = `${process.env.GITHUB_ARTICLES_REPO_OWNER ?? "techmc-wiki"}/${process.env.GITHUB_ARTICLES_REPO_NAME ?? "Articles"}`

const NOREPLY_PATTERN = /\+([a-z\d-]+)@users\.noreply\.github\.com/i

type AliasMap = Record<string, string[]>

interface GitAuthor {
  displayName: string
  email: string
}

function getGitAuthors(): GitAuthor[] {
  let stdout: string
  try {
    stdout = execFileSync("git", ["log", "--all", "--format=%an%x00%ae"], {
      cwd: ARTICLES_PATH,
      encoding: "utf-8",
    })
  } catch {
    return []
  }

  const authors: GitAuthor[] = []
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const nullIndex = trimmed.indexOf("\0")
    if (nullIndex === -1) continue
    const displayName = trimmed.slice(0, nullIndex)
    const email = trimmed.slice(nullIndex + 1)
    if (displayName && email) {
      authors.push({ displayName, email })
    }
  }
  return authors
}

function extractNoreplyUsername(email: string): string | undefined {
  const match = email.match(NOREPLY_PATTERN)
  return match?.[1]
}

interface GithubCommit {
  author?: { login?: string } | null
}

async function fetchGithubLoginFromEmail(
  email: string,
  headers: Record<string, string>
): Promise<string | undefined> {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_ARTICLES_REPO}/commits?author=${encodeURIComponent(email)}&per_page=1`
  try {
    const response = await fetch(url, { headers })
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        logger.warn("authors.alias.lookup-skipped", {
          reason: "rate-limited",
          status_code: response.status,
        })
      } else {
        logger.warn("authors.alias.lookup-skipped", {
          reason: "unexpected-status",
          status_code: response.status,
        })
      }
      return undefined
    }
    const data = (await response.json()) as GithubCommit[]
    if (data.length > 0 && data[0]?.author?.login) {
      return data[0].author.login
    }
    return undefined
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn(
      "authors.alias.lookup-skipped",
      { reason: "request-failed" },
      message
    )
    return undefined
  }
}

async function getGithubUsernameForEmail(
  email: string
): Promise<string | undefined> {
  const noreply = extractNoreplyUsername(email)
  if (noreply) return noreply

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "gtmc-alias-script",
  }
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`
  return fetchGithubLoginFromEmail(email, headers)
}

function loadManualAliases(): AliasMap {
  if (!existsSync(OVERRIDES_PATH)) return {}
  const parsed = yamlLoad(readFileSync(OVERRIDES_PATH, "utf-8"))
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
  return parsed as AliasMap
}

// Manual aliases replace history-derived aliases for the same canonical author.
function mergeAliases(auto: AliasMap, manual: AliasMap): AliasMap {
  const merged = { ...auto }
  for (const [canonical, aliases] of Object.entries(manual)) {
    merged[canonical] = [...new Set(aliases)].toSorted()
  }

  const sorted: AliasMap = {}
  for (const key of Object.keys(merged).toSorted()) {
    sorted[key] = merged[key]
  }
  return sorted
}

async function generateAliases(): Promise<AliasMap> {
  const authors = getGitAuthors()

  const emailToDisplayNames = new Map<string, Set<string>>()
  for (const { displayName, email } of authors) {
    const set = emailToDisplayNames.get(email) ?? new Set<string>()
    set.add(displayName)
    emailToDisplayNames.set(email, set)
  }

  // Resolution is order-independent, so concurrent lookups avoid serial API latency.
  const distinctEmails = [...emailToDisplayNames.keys()]
  const usernames = await Promise.all(
    distinctEmails.map((email) => getGithubUsernameForEmail(email))
  )
  const usernameToEmails = new Map<string, Set<string>>()
  for (let i = 0; i < distinctEmails.length; i++) {
    const email = distinctEmails[i]
    const username = usernames[i]
    if (!username || !email) continue
    const set = usernameToEmails.get(username) ?? new Set<string>()
    set.add(email)
    usernameToEmails.set(username, set)
  }

  const aliasesByCanonical: AliasMap = {}
  for (const [canonical, emails] of usernameToEmails) {
    const displayNames = new Set<string>()
    for (const email of emails) {
      const names = emailToDisplayNames.get(email)
      if (names) {
        for (const name of names) displayNames.add(name)
      }
    }
    const aliases = [...displayNames].filter((n) => n !== canonical).toSorted()
    if (aliases.length > 0) {
      aliasesByCanonical[canonical] = aliases
    }
  }

  return aliasesByCanonical
}

async function main(): Promise<void> {
  const autoAliases = await generateAliases()
  const manualAliases = loadManualAliases()
  const aliases = mergeAliases(autoAliases, manualAliases)

  const header =
    "# Auto-generated author aliases (canonical_username -> [alias, ...]).\n" +
    "# Generated from the articles Git history by `pnpm generate:aliases`,\n" +
    "# then corrected by author-alias-overrides.yml.\n" +
    "# Manual overrides belong in author-alias-overrides.yml.\n"

  const body = yamlDump(aliases, {
    sortKeys: true,
    lineWidth: -1,
    noRefs: true,
  })

  writeFileSync(OUTPUT_PATH, header + body, "utf-8")
  logger.event("authors.aliases.generated", {
    canonical_author_count: Object.keys(aliases).length,
  })
}

void main()
