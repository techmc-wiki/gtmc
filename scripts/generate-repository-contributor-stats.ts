import { execFileSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { createLogger } from "./lib/logger"

const logger = createLogger("repository-contributors")
const OUTPUT_PATH = join(
  process.cwd(),
  "data",
  "repository-contributor-stats.json"
)
const MAX_ATTEMPTS = 5

type GitHubContributorActivity = {
  author: { login?: string } | null
  total: number
  weeks: Array<{ a: number; d: number; c: number }>
}

type RepositoryContributorStats = Record<
  string,
  { commits: number; linesChanged: number }
>

function getRepositoryFromEnvironment(): string | null {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY

  const owner = process.env.VERCEL_GIT_REPO_OWNER_SLUG
  const name = process.env.VERCEL_GIT_REPO_SLUG
  return owner && name ? `${owner}/${name}` : null
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

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function fetchContributorActivity(
  repository: string,
  attempt = 0
): Promise<GitHubContributorActivity[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const response = await fetch(
    `https://api.github.com/repos/${repository}/stats/contributors`,
    { headers }
  )

  if (response.status === 202 && attempt < MAX_ATTEMPTS - 1) {
    await wait(2 ** attempt * 1000)
    return fetchContributorActivity(repository, attempt + 1)
  }
  if (!response.ok) {
    throw new Error(
      `GitHub contributor statistics returned HTTP ${response.status}`
    )
  }

  return (await response.json()) as GitHubContributorActivity[]
}

function aggregateContributorActivity(
  contributors: GitHubContributorActivity[]
): RepositoryContributorStats {
  const stats: RepositoryContributorStats = {}

  for (const contributor of contributors) {
    const login = contributor.author?.login
    if (!login) continue

    stats[login.toLocaleLowerCase("en-US")] = {
      commits: contributor.total,
      linesChanged: contributor.weeks.reduce(
        (total, week) => total + week.a + Math.abs(week.d),
        0
      ),
    }
  }

  return Object.fromEntries(
    Object.entries(stats).toSorted(([left], [right]) =>
      left.localeCompare(right)
    )
  )
}

async function main(): Promise<void> {
  const repository = getRepositoryFromEnvironment() ?? getRepositoryFromRemote()
  if (!repository) {
    throw new Error("Unable to determine the GitHub repository")
  }

  const contributors = await fetchContributorActivity(repository)
  const stats = aggregateContributorActivity(contributors)
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
