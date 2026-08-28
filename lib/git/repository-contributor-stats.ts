import contributorStatsData from "@/data/repository-contributor-stats.json"

export interface RepositoryContributorStats {
  commits: number
  linesChanged: number
}

const contributorStats = contributorStatsData as Readonly<
  Record<string, RepositoryContributorStats>
>

function normalizeIdentity(value: string): string {
  return value.trim().toLocaleLowerCase("en-US")
}

/** Read contributor activity captured during the production build. */
export function getRepositoryContributorStats(
  identities: string[]
): RepositoryContributorStats {
  const targets = new Set(
    identities.flatMap((identity) => {
      const normalized = normalizeIdentity(identity)
      return normalized ? [normalized] : []
    })
  )
  let commits = 0
  let linesChanged = 0

  for (const [login, stats] of Object.entries(contributorStats)) {
    if (!targets.has(normalizeIdentity(login))) continue
    commits += stats.commits
    linesChanged += stats.linesChanged
  }

  return { commits, linesChanged }
}
