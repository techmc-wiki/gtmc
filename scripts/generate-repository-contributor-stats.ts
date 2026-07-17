import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { resolveGithubArticlesReadToken } from "@/lib/github/tokens"
import { createLogger } from "./lib/logger"

const logger = createLogger("repository-contributors")
const OUTPUT_PATH = join(
  process.cwd(),
  "data",
  "repository-contributor-stats.json"
)
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"
const COMMIT_MARKER = "__GTMC_COMMIT__"
const FIELD_SEPARATOR = "\u001f"

type GitHubCommitActivity = {
  additions: number
  deletions: number
  changedFilesIfAvailable: number | null
  author: { user: { login: string } | null } | null
  parents: { totalCount: number }
}

type GitHubCommitHistory = {
  nodes: Array<GitHubCommitActivity | null>
  pageInfo: { hasNextPage: boolean; endCursor: string | null }
}

type GitHubHistoryPage = {
  data?: {
    repository?: {
      defaultBranchRef?: {
        target?: {
          history?: GitHubCommitHistory
        }
      }
    }
  }
  errors?: Array<{ message: string }>
}

type RepositoryContributorStats = Record<
  string,
  { commits: number; linesChanged: number }
>

type LocalCommitActivity = {
  authorName: string
  authorEmail: string
  linesChanged: number
  hasChanges: boolean
}

const HISTORY_QUERY = `
  query RepositoryContributorActivity(
    $owner: String!
    $name: String!
    $cursor: String
  ) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        target {
          ... on Commit {
            history(first: 100, after: $cursor) {
              nodes {
                additions
                deletions
                changedFilesIfAvailable
                author {
                  user {
                    login
                  }
                }
                parents(first: 2) {
                  totalCount
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      }
    }
  }
`

function getRepositoryFromEnvironment(): string | null {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY

  const owner = process.env.VERCEL_GIT_REPO_OWNER_SLUG
  const name = process.env.VERCEL_GIT_REPO_SLUG
  return owner && name ? `${owner}/${name}` : null
}

function getRepositoryFromPackage(): string | null {
  try {
    const packageMetadata = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8")
    ) as { repository?: string | { url?: string } }
    const repository = packageMetadata.repository
    const url = typeof repository === "string" ? repository : repository?.url
    if (!url) return null
    return /github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/.exec(url)?.[1] ?? null
  } catch {
    return null
  }
}

function getRepositoryFromRemote(): string | null {
  try {
    const remote = execFileSync(
      "git",
      ["config", "--get", "remote.origin.url"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }
    ).trim()
    return /github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/.exec(remote)?.[1] ?? null
  } catch {
    return null
  }
}

function getGitHubToken(): string | null {
  const environmentToken = resolveGithubArticlesReadToken()
  if (environmentToken) return environmentToken

  try {
    return execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return null
  }
}

function getNoreplyLogin(email: string): string | null {
  return (
    /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i.exec(email)?.[1] ?? null
  )
}

function loadLocalContributorStats(): RepositoryContributorStats {
  const output = execFileSync(
    "git",
    [
      "log",
      "--no-merges",
      `--format=${COMMIT_MARKER}%x1f%aN%x1f%aE`,
      "--numstat",
      "--no-renames",
      "HEAD",
      "--",
      ".",
      ":(exclude)articles",
      ":(exclude)glossary",
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  )
  const commits: LocalCommitActivity[] = []
  let current: LocalCommitActivity | null = null

  for (const line of output.split("\n")) {
    if (line.startsWith(`${COMMIT_MARKER}${FIELD_SEPARATOR}`)) {
      const [, authorName = "", authorEmail = ""] = line.split(FIELD_SEPARATOR)
      current = { authorName, authorEmail, linesChanged: 0, hasChanges: false }
      commits.push(current)
      continue
    }
    if (!current) continue

    const match = /^(\d+|-)\t(\d+|-)\t/.exec(line)
    if (!match) continue
    current.hasChanges = true
    current.linesChanged +=
      (match[1] === "-" ? 0 : Number(match[1])) +
      (match[2] === "-" ? 0 : Number(match[2]))
  }

  const loginByAuthorName = new Map<string, string>()
  for (const commit of commits) {
    const login = getNoreplyLogin(commit.authorEmail)
    if (login) loginByAuthorName.set(commit.authorName, login)
  }

  const stats: RepositoryContributorStats = {}
  for (const commit of commits) {
    if (!commit.hasChanges) continue
    const login =
      getNoreplyLogin(commit.authorEmail) ??
      loginByAuthorName.get(commit.authorName) ??
      commit.authorName
    const key = login.trim().toLocaleLowerCase("en-US")
    if (!key) continue
    const contributor = stats[key] ?? { commits: 0, linesChanged: 0 }
    contributor.commits += 1
    contributor.linesChanged += commit.linesChanged
    stats[key] = contributor
  }

  return stats
}

async function fetchHistoryPage(
  owner: string,
  name: string,
  cursor: string | null,
  token: string
): Promise<GitHubCommitHistory> {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      query: HISTORY_QUERY,
      variables: { owner, name, cursor },
    }),
  })
  if (!response.ok) {
    throw new Error(`GitHub GraphQL returned HTTP ${response.status}`)
  }

  const payload = (await response.json()) as GitHubHistoryPage
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "))
  }

  const history = payload.data?.repository?.defaultBranchRef?.target?.history
  if (!history) {
    throw new Error("GitHub returned no default-branch commit history")
  }
  return history
}

async function loadContributorStats(
  repository: string,
  token: string
): Promise<RepositoryContributorStats> {
  const [owner, name, ...rest] = repository.split("/")
  if (!owner || !name || rest.length > 0) {
    throw new Error(`Invalid GitHub repository: ${repository}`)
  }

  const stats: RepositoryContributorStats = {}
  const loadPage = async (
    cursor: string | null,
    pageCount: number
  ): Promise<number> => {
    const history = await fetchHistoryPage(owner, name, cursor, token)

    for (const commit of history.nodes) {
      const login = commit?.author?.user?.login
      if (!commit || !login || commit.changedFilesIfAvailable === 0) {
        continue
      }

      const key = login.toLocaleLowerCase("en-US")
      const contributor = stats[key] ?? { commits: 0, linesChanged: 0 }
      if (commit.parents.totalCount <= 1) contributor.commits += 1
      contributor.linesChanged += commit.additions + commit.deletions
      stats[key] = contributor
    }

    const nextPageCount = pageCount + 1
    if (!history.pageInfo.hasNextPage) return nextPageCount
    const nextCursor = history.pageInfo.endCursor
    if (!nextCursor) {
      throw new Error("GitHub history pagination omitted its cursor")
    }
    return loadPage(nextCursor, nextPageCount)
  }

  const pageCount = await loadPage(null, 0)
  logger.event("repository-contributors.fetched", { page_count: pageCount })
  return Object.fromEntries(
    Object.entries(stats).toSorted(([left], [right]) =>
      left.localeCompare(right)
    )
  )
}

async function main(): Promise<void> {
  const repository =
    getRepositoryFromEnvironment() ??
    getRepositoryFromPackage() ??
    getRepositoryFromRemote()
  if (!repository) throw new Error("Unable to determine the GitHub repository")

  const token = getGitHubToken()
  if (!token && (process.env.CI === "true" || process.env.VERCEL === "1")) {
    throw new Error(
      "GitHub authentication is required; set GITHUB_TOKEN or GITHUB_ARTICLES_READ_PAT"
    )
  }

  if (!token) {
    logger.warn("repository-contributors.local-fallback", {
      reason: "authentication-unavailable",
    })
  }
  const stats = token
    ? await loadContributorStats(repository, token)
    : loadLocalContributorStats()
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(stats, null, 2)}\n`)
  logger.event("repository-contributors.generated", {
    contributor_count: Object.keys(stats).length,
    repository,
  })
}

main().catch((error: unknown) => {
  logger.error("repository-contributors.failed", {}, String(error))
  process.exit(1)
})
