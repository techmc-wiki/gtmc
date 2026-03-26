// @ts-ignore Bun provides this module in test runtime.
import { describe, expect, it, beforeEach, mock } from "bun:test"

const mockCompareCommits = mock()
const mockGetCommit = mock()
const mockGetContent = mock()
const mockRevisionUpdate = mock(async () => ({}))
const mockRevisionFindUnique = mock(async () => null)

mock.module("@/lib/github-pr", () => ({
  getOctokit: mock(() => ({
    repos: {
      compareCommits: mockCompareCommits,
      getCommit: mockGetCommit,
      getContent: mockGetContent,
    },
  })),
  ARTICLES_REPO_OWNER: "gtmc-dev",
  ARTICLES_REPO_NAME: "Articles",
}))

mock.module("@/lib/prisma", () => ({
  prisma: {
    revision: {
      update: mockRevisionUpdate,
      findUnique: mockRevisionFindUnique,
    },
  },
}))

const { rebaseArticleContent, analyzeRebaseNeed, abortRebase, resumeRebase } =
  await import("./article-rebase")
import type { RebaseInput, AnalyzeRebaseInput } from "./article-rebase"

describe("rebaseArticleContent", () => {
  beforeEach(() => {
    mockCompareCommits.mockReset()
    mockGetCommit.mockReset()
    mockGetContent.mockReset()
    mockRevisionUpdate.mockReset()
    mockRevisionFindUnique.mockReset()
    mockCompareCommits.mockImplementation(async () => ({
      data: { commits: [] },
    }))
    mockGetCommit.mockImplementation(async () => ({ data: { files: [] } }))
    mockGetContent.mockImplementation(async () => ({
      data: { type: "file", content: "", sha: "" },
    }))
    mockRevisionUpdate.mockImplementation(async () => ({}))
    mockRevisionFindUnique.mockImplementation(async () => null)
  })

  it("NO_CHANGE: baseMainSha === latestMainSha", async () => {
    const input: RebaseInput = {
      draftId: "draft-1",
      filePath: "test.md",
      baseMainSha: "abc123",
      latestMainSha: "abc123",
      draftContent: "draft content",
    }

    const result = await rebaseArticleContent(input)

    expect(result.status).toBe("NO_CHANGE")
    expect(result).toHaveProperty("message")
  })

  it("NO_CHANGE: no commits modified the file", async () => {
    mockCompareCommits.mockImplementation(async () => ({
      data: {
        commits: [
          {
            sha: "commit1",
            commit: {
              message: "Update other file",
              author: { name: "Author", date: "2024-01-01" },
            },
          },
        ],
      },
    }))
    mockGetCommit.mockImplementation(async () => ({
      data: { files: [{ filename: "other.md" }] },
    }))

    const input: RebaseInput = {
      draftId: "draft-1",
      filePath: "test.md",
      baseMainSha: "abc123",
      latestMainSha: "def456",
      draftContent: "draft content",
    }

    const result = await rebaseArticleContent(input)

    expect(result.status).toBe("NO_CHANGE")
  })

  it("SUCCESS: 2 commits, both modify file, no conflicts", async () => {
    mockCompareCommits.mockImplementation(async () => ({
      data: {
        commits: [
          {
            sha: "c1",
            commit: {
              message: "First",
              author: { name: "A1", date: "2024-01-01" },
            },
          },
          {
            sha: "c2",
            commit: {
              message: "Second",
              author: { name: "A2", date: "2024-01-02" },
            },
          },
        ],
      },
    }))

    mockGetCommit.mockImplementation(async () => {
      return { data: { files: [{ filename: "test.md" }] } }
    })

    const contentMap: Record<string, string> = {
      abc: "line1",
      c1: "line1\nline2",
      c2: "line1\nline2\nline3",
    }
    mockGetContent.mockImplementation(async ({ ref }: any) => ({
      data: {
        type: "file",
        content: Buffer.from(contentMap[ref] || "").toString("base64"),
        sha: "s" + ref,
      },
    }))

    const result = await rebaseArticleContent({
      draftId: "draft-1",
      filePath: "test.md",
      baseMainSha: "abc",
      latestMainSha: "def",
      draftContent: "line1\nline2",
    })

    expect(result.status).toBe("SUCCESS")
    if (result.status === "SUCCESS") {
      expect(result.appliedCommits).toHaveLength(2)
    }
  })

  it("CONFLICT: 2 commits, commit 2 conflicts", async () => {
    mockCompareCommits.mockImplementation(async () => ({
      data: {
        commits: [
          {
            sha: "c1",
            commit: {
              message: "First",
              author: { name: "A1", date: "2024-01-01" },
            },
          },
          {
            sha: "c2",
            commit: {
              message: "Conflict",
              author: { name: "A2", date: "2024-01-02" },
            },
          },
        ],
      },
    }))

    mockGetCommit.mockImplementation(async () => {
      return { data: { files: [{ filename: "test.md" }] } }
    })

    const contentMap: Record<string, string> = {
      abc: "line1",
      c1: "line1\nline2",
      c2: "line1\nline2\nline3",
    }
    mockGetContent.mockImplementation(async ({ ref }: any) => ({
      data: {
        type: "file",
        content: Buffer.from(contentMap[ref] || "").toString("base64"),
        sha: "s" + ref,
      },
    }))

    const result = await rebaseArticleContent({
      draftId: "draft-1",
      filePath: "test.md",
      baseMainSha: "abc",
      latestMainSha: "def",
      draftContent: "line1\nline2\ndraft",
    })

    expect(result.status).toBe("CONFLICT")
    if (result.status === "CONFLICT") {
      expect(result.conflictCommit.sha).toBe("c1")
    }
  })

  it("SUCCESS with irrelevant commits: 3 commits, only 1 modifies file", async () => {
    mockCompareCommits.mockImplementation(async () => ({
      data: {
        commits: [
          {
            sha: "c1",
            commit: {
              message: "Other",
              author: { name: "A1", date: "2024-01-01" },
            },
          },
          {
            sha: "c2",
            commit: {
              message: "Target",
              author: { name: "A2", date: "2024-01-02" },
            },
          },
          {
            sha: "c3",
            commit: {
              message: "Another",
              author: { name: "A3", date: "2024-01-03" },
            },
          },
        ],
      },
    }))

    const commitMap: Record<string, any> = {
      c1: { data: { files: [{ filename: "other.md" }] } },
      c2: { data: { files: [{ filename: "test.md" }] } },
      c3: { data: { files: [{ filename: "another.md" }] } },
    }
    mockGetCommit.mockImplementation(async ({ ref }: any) => {
      return commitMap[ref] || { data: { files: [] } }
    })

    const contentMap: Record<string, string> = {
      abc: "base",
      c2: "base\nupdated",
    }
    mockGetContent.mockImplementation(async ({ ref }: any) => ({
      data: {
        type: "file",
        content: Buffer.from(contentMap[ref] || "").toString("base64"),
        sha: "s" + ref,
      },
    }))

    const result = await rebaseArticleContent({
      draftId: "draft-1",
      filePath: "test.md",
      baseMainSha: "abc",
      latestMainSha: "def",
      draftContent: "base\nupdated",
    })

    expect(result.status).toBe("SUCCESS")
    if (result.status === "SUCCESS") {
      expect(result.appliedCommits).toHaveLength(1)
      expect(result.appliedCommits[0].sha).toBe("c2")
    }
  })

  it("FILE_DELETED_CONFLICT: file deleted in latest main", async () => {
    mockCompareCommits.mockImplementation(async () => ({
      data: {
        commits: [
          {
            sha: "c1",
            commit: {
              message: "Delete article",
              author: { name: "Maintainer", date: "2024-02-01" },
            },
          },
        ],
      },
    }))

    mockGetCommit.mockImplementation(async () => ({
      data: { files: [{ filename: "test.md" }] },
    }))

    mockGetContent.mockImplementation(async ({ ref }: any) => {
      if (ref === "abc") {
        return {
          data: {
            type: "file",
            content: Buffer.from("original content").toString("base64"),
            sha: "sabc",
          },
        }
      }
      throw new Error("404 Not Found")
    })

    const result = await rebaseArticleContent({
      draftId: "draft-del",
      filePath: "test.md",
      baseMainSha: "abc",
      latestMainSha: "def",
      draftContent: "my draft content",
    })

    expect(result.status).toBe("FILE_DELETED_CONFLICT")
    if (result.status === "FILE_DELETED_CONFLICT") {
      expect(result.draftContent).toBe("my draft content")
      expect(result.deletedAtCommit.sha).toBe("c1")
      expect(result.appliedCommits).toHaveLength(0)
    }
  })
})

describe("analyzeRebaseNeed", () => {
  beforeEach(() => {
    mockCompareCommits.mockReset()
    mockGetCommit.mockReset()
    mockRevisionUpdate.mockReset()
    mockRevisionFindUnique.mockReset()
    mockCompareCommits.mockImplementation(async () => ({
      data: { commits: [] },
    }))
    mockGetCommit.mockImplementation(async () => ({ data: { files: [] } }))
    mockRevisionUpdate.mockImplementation(async () => ({}))
    mockRevisionFindUnique.mockImplementation(async () => null)
  })

  it("returns QUICK_MERGE_OK when baseMainSha === latestMainSha", async () => {
    const input: AnalyzeRebaseInput = {
      filePath: "test.md",
      baseMainSha: "abc123",
      latestMainSha: "abc123",
    }

    const result = await analyzeRebaseNeed(input)

    expect(result.recommendation).toBe("QUICK_MERGE_OK")
    expect(result.totalCommits).toBe(0)
    expect(result.fileEditCount).toBe(0)
    expect(result.commitInfos).toHaveLength(0)
    expect(result.adminMessage).toBe(
      "No changes in main since draft was created."
    )
  })

  it("returns REBASE_RECOMMENDED when file modified in multiple commits", async () => {
    mockCompareCommits.mockImplementation(async () => ({
      data: {
        commits: [
          {
            sha: "c1",
            commit: {
              message: "Edit article part 1",
              author: { name: "A1", date: "2024-01-01" },
            },
          },
          {
            sha: "c2",
            commit: {
              message: "Edit article part 2",
              author: { name: "A2", date: "2024-01-02" },
            },
          },
          {
            sha: "c3",
            commit: {
              message: "Edit article part 3",
              author: { name: "A3", date: "2024-01-03" },
            },
          },
          {
            sha: "c4",
            commit: {
              message: "Other file change",
              author: { name: "A4", date: "2024-01-04" },
            },
          },
          {
            sha: "c5",
            commit: {
              message: "Another other change",
              author: { name: "A5", date: "2024-01-05" },
            },
          },
        ],
      },
    }))

    const commitFileMap: Record<string, string[]> = {
      c1: ["test.md"],
      c2: ["test.md"],
      c3: ["test.md"],
      c4: ["other.md"],
      c5: ["another.md"],
    }
    mockGetCommit.mockImplementation(async ({ ref }: any) => ({
      data: {
        files: (commitFileMap[ref] || []).map((filename) => ({ filename })),
      },
    }))

    const input: AnalyzeRebaseInput = {
      filePath: "test.md",
      baseMainSha: "base",
      latestMainSha: "latest",
    }

    const result = await analyzeRebaseNeed(input)

    expect(result.recommendation).toBe("REBASE_RECOMMENDED")
    expect(result.totalCommits).toBe(5)
    expect(result.fileEditCount).toBe(3)
    expect(result.commitInfos).toHaveLength(3)
    expect(result.adminMessage).toBe(
      "The article was modified in 3 separate commits. Fine-grained rebase is recommended to resolve each change individually."
    )
  })

  it("returns QUICK_MERGE_OK when file modified in 0 or 1 commit", async () => {
    const inputZero: AnalyzeRebaseInput = {
      filePath: "test.md",
      baseMainSha: "base",
      latestMainSha: "latest",
    }

    const resultZero = await analyzeRebaseNeed(inputZero)

    expect(resultZero.recommendation).toBe("QUICK_MERGE_OK")
    expect(resultZero.fileEditCount).toBe(0)
    expect(resultZero.adminMessage).toBe(
      "The article was modified in no commit. A quick merge should suffice."
    )

    mockCompareCommits.mockImplementation(async () => ({
      data: {
        commits: [
          {
            sha: "c1",
            commit: {
              message: "Edit article",
              author: { name: "A1", date: "2024-01-01" },
            },
          },
          {
            sha: "c2",
            commit: {
              message: "Unrelated",
              author: { name: "A2", date: "2024-01-02" },
            },
          },
        ],
      },
    }))

    const commitFileMap: Record<string, string[]> = {
      c1: ["test.md"],
      c2: ["other.md"],
    }
    mockGetCommit.mockImplementation(async ({ ref }: any) => ({
      data: {
        files: (commitFileMap[ref] || []).map((filename) => ({ filename })),
      },
    }))

    const inputOne: AnalyzeRebaseInput = {
      filePath: "test.md",
      baseMainSha: "base",
      latestMainSha: "latest",
    }

    const resultOne = await analyzeRebaseNeed(inputOne)

    expect(resultOne.recommendation).toBe("QUICK_MERGE_OK")
    expect(resultOne.fileEditCount).toBe(1)
    expect(resultOne.totalCommits).toBe(2)
    expect(resultOne.adminMessage).toBe(
      "The article was modified in 1 commit. A quick merge should suffice."
    )
  })
})

describe("abortRebase", () => {
  beforeEach(() => {
    mockRevisionUpdate.mockReset()
    mockRevisionFindUnique.mockReset()
    mockRevisionUpdate.mockImplementation(async () => ({}))
    mockRevisionFindUnique.mockImplementation(async () => null)
  })

  it("restores original content when conflict state exists", async () => {
    mockRevisionFindUnique.mockImplementation(async () => ({
      rebaseState: {
        status: "CONFLICT",
        commitShas: ["c1", "c2"],
        currentCommitIndex: 1,
        conflictedCommitSha: "c2",
        originalContent: "original body",
        commitInfos: [],
      },
    }))

    const result = await abortRebase({ draftId: "draft-1" })

    expect(result).toEqual({
      status: "ABORTED",
      originalContent: "original body",
    })
    expect(mockRevisionUpdate).toHaveBeenCalledWith({
      where: { id: "draft-1" },
      data: {
        content: "original body",
        rebaseState: {
          status: "ABORTED",
          commitShas: ["c1", "c2"],
          currentCommitIndex: 1,
          conflictedCommitSha: "c2",
          originalContent: "original body",
          commitInfos: [],
        },
      },
    })
  })

  it("returns error when no active rebase", async () => {
    mockRevisionFindUnique.mockImplementation(async () => ({
      rebaseState: {
        status: "COMPLETED",
        commitShas: [],
        currentCommitIndex: 0,
        originalContent: "original body",
        commitInfos: [],
      },
    }))

    const result = await abortRebase({ draftId: "draft-1" })

    expect(result).toEqual({
      status: "ERROR",
      message: "No active rebase to abort",
    })
    expect(mockRevisionUpdate).not.toHaveBeenCalled()
  })
})

describe("resumeRebase", () => {
  beforeEach(() => {
    mockGetContent.mockReset()
    mockRevisionUpdate.mockReset()
    mockRevisionFindUnique.mockReset()
    mockGetContent.mockImplementation(async () => ({
      data: { type: "file", content: "", sha: "" },
    }))
    mockRevisionUpdate.mockImplementation(async () => ({}))
    mockRevisionFindUnique.mockImplementation(async () => null)
  })

  it("continues from conflict and completes successfully", async () => {
    mockRevisionFindUnique.mockImplementation(async () => ({
      filePath: "test.md",
      rebaseState: {
        status: "CONFLICT",
        commitShas: ["c1", "c2"],
        currentCommitIndex: 0,
        conflictedCommitSha: "c1",
        originalContent: "draft",
        commitInfos: [
          {
            sha: "c1",
            message: "first",
            author: "A1",
            timestamp: "2024-01-01",
          },
          {
            sha: "c2",
            message: "second",
            author: "A2",
            timestamp: "2024-01-02",
          },
        ],
      },
    }))

    mockGetContent.mockImplementation(async ({ ref }: any) => {
      const contentMap: Record<string, string> = {
        c1: "resolved",
        c2: "resolved\nnext",
      }
      return {
        data: {
          type: "file",
          content: Buffer.from(contentMap[ref] || "").toString("base64"),
          sha: `s${ref}`,
        },
      }
    })

    const result = await resumeRebase({
      draftId: "draft-1",
      resolvedContent: "resolved",
    })

    expect(result.status).toBe("SUCCESS")
    if (result.status === "SUCCESS") {
      expect(result.finalContent).toBe("resolved\nnext")
      expect(result.appliedCommits.map((c) => c.sha)).toEqual(["c2"])
    }
  })

  it("returns error when state is not CONFLICT", async () => {
    mockRevisionFindUnique.mockImplementation(async () => ({
      filePath: "test.md",
      rebaseState: {
        status: "IN_PROGRESS",
        commitShas: ["c1"],
        currentCommitIndex: 0,
        originalContent: "draft",
        commitInfos: [],
      },
    }))

    const result = await resumeRebase({
      draftId: "draft-1",
      resolvedContent: "resolved",
    })

    expect(result).toEqual({
      status: "ERROR",
      message: "No conflict to resume from",
    })
    expect(mockRevisionUpdate).not.toHaveBeenCalled()
  })
})
