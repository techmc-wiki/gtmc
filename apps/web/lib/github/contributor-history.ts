export type RepositoryContributorStats = Record<
  string,
  { commits: number; linesChanged: number }
>

export interface GitHubCommitActivity {
  additions: number
  deletions: number
  changedFilesIfAvailable: number | null
  author: { user: { login: string } | null } | null
  parents: { totalCount: number }
}

export interface GitHubCommitHistory {
  nodes: Array<GitHubCommitActivity | null>
  pageInfo: { hasNextPage: boolean; endCursor: string | null }
}

export interface GitHubHistoryResult {
  revision: string
  history: GitHubCommitHistory
}

/** Discover opaque cursors without computing diffs, then load four pages at a time. */
export async function collectContributorHistory(
  initial: GitHubHistoryResult,
  loadPage: (
    cursor: string,
    includeActivity: boolean
  ) => Promise<GitHubHistoryResult>
): Promise<{ stats: RepositoryContributorStats; pageCount: number }> {
  const cursors: string[] = []
  let pageInfo = initial.history.pageInfo
  while (pageInfo.hasNextPage) {
    const cursor = pageInfo.endCursor
    if (!cursor) throw new Error("GitHub history pagination omitted its cursor")
    cursors.push(cursor)
    const next = await loadPage(cursor, false)
    assertRevision(next)
    pageInfo = next.history.pageInfo
  }

  const stats: RepositoryContributorStats = {}
  addActivity(initial.history)
  let nextPage = 0
  await Promise.all(
    Array.from({ length: Math.min(4, cursors.length) }, async () => {
      while (nextPage < cursors.length) {
        const cursor = cursors[nextPage++]
        const page = await loadPage(cursor, true)
        assertRevision(page)
        addActivity(page.history)
      }
    })
  )
  return { stats, pageCount: cursors.length + 1 }

  function assertRevision(page: GitHubHistoryResult): void {
    if (page.revision !== initial.revision) {
      throw new Error("GitHub default branch changed while loading history")
    }
  }

  function addActivity(history: GitHubCommitHistory): void {
    for (const commit of history.nodes) {
      const login = commit?.author?.user?.login
      if (!commit || !login || commit.changedFilesIfAvailable === 0) continue
      const key = login.toLocaleLowerCase("en-US")
      const contributor = stats[key] ?? { commits: 0, linesChanged: 0 }
      if (commit.parents.totalCount <= 1) contributor.commits += 1
      contributor.linesChanged += commit.additions + commit.deletions
      stats[key] = contributor
    }
  }
}
