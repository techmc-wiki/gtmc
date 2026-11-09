import { describe, expect, it } from "vite-plus/test"
import {
  collectContributorHistory,
  type GitHubCommitActivity,
  type GitHubHistoryResult,
} from "./contributor-history"

function commit(
  login: string | null = "Alice",
  additions = 10,
  deletions = 2,
  parentCount = 1,
  changedFilesIfAvailable: number | null = 1
): GitHubCommitActivity {
  return {
    author: { user: login ? { login } : null },
    additions,
    deletions,
    parents: { totalCount: parentCount },
    changedFilesIfAvailable,
  }
}

function page(
  nodes: Array<GitHubCommitActivity | null>,
  cursor: string | null = null,
  revision = "head"
): GitHubHistoryResult {
  return {
    revision,
    history: {
      nodes,
      pageInfo: { hasNextPage: cursor !== null, endCursor: cursor },
    },
  }
}

describe("collectContributorHistory", () => {
  it("aggregates every page exactly once with at most four activity requests in flight", async () => {
    const release = Promise.withResolvers<void>()
    const saturated = Promise.withResolvers<void>()
    let active = 0
    const resultPromise = collectContributorHistory(
      page([commit("Alice", 2, 1)], "1"),
      async (cursor, includeActivity) => {
        const index = Number(cursor)
        const nextCursor = index < 8 ? String(index + 1) : null
        if (!includeActivity) return page([], nextCursor)
        active += 1
        if (active > 4) throw new Error("Unbounded GitHub activity requests")
        if (active === 4) saturated.resolve()
        await release.promise
        active -= 1
        return page([commit("Bob", index, 1)], nextCursor)
      }
    )
    await saturated.promise
    expect(active).toBe(4)
    release.resolve()
    const result = await resultPromise
    expect(result.stats).toEqual({
      alice: { commits: 1, linesChanged: 3 },
      bob: { commits: 8, linesChanged: 44 },
    })
    expect(result.pageCount).toBe(9)
  })

  it("preserves merge lines, empty-commit filtering, and GitHub-linked identities", async () => {
    const result = await collectContributorHistory(
      page([
        commit("ALICE", 3, 4, 2),
        commit("Alice", 0, 0, 1, 0),
        commit(null, 100, 0),
        null,
        commit("Bob", 0, 0, 0, null),
      ]),
      async () => {
        throw new Error("Unexpected history request")
      }
    )
    expect(result.stats).toEqual({
      alice: { commits: 0, linesChanged: 7 },
      bob: { commits: 1, linesChanged: 0 },
    })
  })

  it("rejects a branch change during cursor discovery", async () => {
    await expect(
      collectContributorHistory(page([commit()], "next"), async () =>
        page([], null, "new-head")
      )
    ).rejects.toThrow("GitHub default branch changed")
  })

  it("rejects a branch change during activity fetching", async () => {
    await expect(
      collectContributorHistory(
        page([commit()], "next"),
        async (_cursor, includeActivity) =>
          page([], null, includeActivity ? "new-head" : "head")
      )
    ).rejects.toThrow("GitHub default branch changed")
  })

  it("rejects missing cursors instead of persisting truncated totals", async () => {
    const initial = page([commit()])
    initial.history.pageInfo.hasNextPage = true
    await expect(
      collectContributorHistory(initial, async () => {
        throw new Error("Unexpected history request")
      })
    ).rejects.toThrow("pagination omitted its cursor")
  })

  it("propagates failed activity requests instead of returning partial totals", async () => {
    await expect(
      collectContributorHistory(
        page([commit()], "next"),
        async (_cursor, includeActivity) => {
          if (includeActivity) throw new Error("GitHub unavailable")
          return page([])
        }
      )
    ).rejects.toThrow("GitHub unavailable")
  })
})
