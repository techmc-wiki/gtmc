/**
 * Generate canonical-to-alias author mapping from git history.
 *
 * Ports the logic from `articles/_scripts/author_aliases.py`:
 *   1. Read all commit authors (`git log --all`) from the articles repo.
 *   2. Group display names by email, then resolve each email to a GitHub
 *      username (noreply pattern first, then the GitHub commits API).
 *   3. Group emails by GitHub username; the username becomes the canonical
 *      key and every distinct display name (minus the canonical) becomes an
 *      alias.
 *   4. Apply manual overrides from `author-alias-overrides.yml` last.
 *   5. Write `authors-alias.yml` sorted by canonical key for stable diffs.
 *
 * The GitHub token is optional but recommended to avoid rate limits. Noreply
 * addresses resolve locally; other addresses use the commits API, matching the
 * legacy Python generator.
 */

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { dump as yamlDump, load as yamlLoad } from "js-yaml"

const CONFIG_DIR = join(process.cwd(), "lib", "articles", "config")
const OUTPUT_PATH = join(CONFIG_DIR, "authors-alias.yml")
const OVERRIDES_PATH = join(CONFIG_DIR, "author-alias-overrides.yml")

const ARTICLES_PATH =
  process.env.ARTICLES_PATH ?? join(process.cwd(), "articles")

const GITHUB_TOKEN = process.env.GITHUB_FEATURES_ISSUES_PAT
const GITHUB_API_BASE = "https://api.github.com"
const GITHUB_ARTICLES_REPO = "gtmc-dev/Articles"

const NOREPLY_PATTERN = /\+([a-z\d-]+)@users\.noreply\.github\.com/i

type AliasMap = Record<string, string[]>

interface GitAuthor {
  displayName: string
  email: string
}

/**
 * Read `(displayName, email)` pairs from `git log --all` in the articles repo.
 * Returns `[]` if git fails or the repo is missing.
 */
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

/**
 * Extract a GitHub username from a `users.noreply.github.com` email.
 * Returns `undefined` if the email is not a noreply address.
 */
function extractNoreplyUsername(email: string): string | undefined {
  const match = email.match(NOREPLY_PATTERN)
  return match?.[1]
}

interface GithubCommit {
  author?: { login?: string } | null
}

/**
 * Query the GitHub commits API to resolve `email` → GitHub login.
 * Returns `undefined` on any network/parse error or empty result.
 * Logs skipped resolution so failures are visible without being fatal.
 */
async function fetchGithubLoginFromEmail(
  email: string,
  headers: Record<string, string>
): Promise<string | undefined> {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_ARTICLES_REPO}/commits?author=${encodeURIComponent(email)}&per_page=1`
  try {
    const response = await fetch(url, { headers })
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        process.stderr.write(
          `Warning: GitHub API rate-limited while resolving <${email}>. Skipping API lookup.\n`
        )
      } else {
        process.stderr.write(
          `Warning: GitHub API returned ${response.status} for <${email}>. Skipping.\n`
        )
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
    process.stderr.write(
      `Warning: GitHub API lookup failed for <${email}>: ${message}. Skipping.\n`
    )
    return undefined
  }
}

/**
 * Resolve a commit email to a GitHub username.
 *
 * Noreply emails resolve locally. Other addresses use the commits API, with
 * authentication when available.
 */
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

/**
 * Load manual overrides YAML. Returns `{}` if the file is missing.
 */
function loadManualAliases(): AliasMap {
  if (!existsSync(OVERRIDES_PATH)) return {}
  const parsed = yamlLoad(readFileSync(OVERRIDES_PATH, "utf-8"))
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
  return parsed as AliasMap
}

/**
 * Apply authoritative manual corrections to the aliases derived from history.
 */
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

/**
 * Build the auto-generated alias map from git history.
 *
 * Mirrors the Python `generate_aliases()`: group display names by email,
 * resolve emails to GitHub usernames, then emit `username → [aliases]` where
 * aliases are the display names that differ from the canonical username.
 */
async function generateAliases(): Promise<AliasMap> {
  const authors = getGitAuthors()

  // email → set of display names
  const emailToDisplayNames = new Map<string, Set<string>>()
  for (const { displayName, email } of authors) {
    const set = emailToDisplayNames.get(email) ?? new Set<string>()
    set.add(displayName)
    emailToDisplayNames.set(email, set)
  }

  // github username → set of emails. Resolve all emails in parallel — order
  // does not affect the final map, and this avoids both an await-in-loop and
  // slow serial API round-trips.
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
  process.stdout.write(
    `Generated authors-alias.yml with ${Object.keys(aliases).length} canonical authors\n`
  )
}

void main()
