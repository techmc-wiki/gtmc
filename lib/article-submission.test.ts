// @ts-expect-error Bun provides this module in test runtime.
import { beforeEach, describe, expect, it, mock } from "bun:test"

const mockGetRef = mock()
const mockGetContent = mock()
const mockCreateOrUpdateFileContents = mock()

mock.module("@/lib/github/articles-repo", () => ({
  ARTICLES_REPO_NAME: "Articles",
  ARTICLES_REPO_OWNER: "gtmc-dev",
  getGitHubWriteToken: mock(() => "token"),
  getOctokit: mock(() => ({
    git: {
      getRef: mockGetRef,
    },
    repos: {
      createOrUpdateFileContents: mockCreateOrUpdateFileContents,
      getContent: mockGetContent,
    },
  })),
}))

const { resolveDraftSyncConflict } = await import("./article-submission")

type SnapshotMap = Record<
  string,
  Record<string, { content: string; sha: string }>
>

function configureOctokitMocks({
  mainShaSequence,
  snapshots,
}: {
  mainShaSequence: string[]
  snapshots: SnapshotMap
}) {
  let mainIndex = 0
  mockGetRef.mockImplementation(async () => ({
    data: {
      object: {
        sha:
          mainShaSequence[Math.min(mainIndex++, mainShaSequence.length - 1)] ??
          mainShaSequence[mainShaSequence.length - 1],
      },
    },
  }))

  mockGetContent.mockImplementation(
    async ({ path, ref }: { path: string; ref: string }) => {
      const snapshot = snapshots[ref]?.[path]
      if (!snapshot) {
        throw new Error(`Missing snapshot for ref=${ref} path=${path}`)
      }

      return {
        data: {
          type: "file",
          sha: snapshot.sha,
          content: Buffer.from(snapshot.content).toString("base64"),
        },
      }
    }
  )
}

const baseInput = {
  authorEmail: "author@example.com",
  authorName: "Author",
  branchName: "submission-branch",
  content: "draft-content",
  filePath: "docs/topic.md",
  title: "Topic",
  token: "token",
}

describe("resolveDraftSyncConflict TOCTOU protections", () => {
  beforeEach(() => {
    mockGetRef.mockReset()
    mockGetContent.mockReset()
    mockCreateOrUpdateFileContents.mockReset()
  })

  it("succeeds on first attempt when main stays stable", async () => {
    configureOctokitMocks({
      mainShaSequence: ["sha-main", "sha-main"],
      snapshots: {
        "sha-main": {
          "docs/topic.md": { content: "main-content", sha: "main-file-sha" },
        },
        "submission-branch": {
          "docs/topic.md": {
            content: "branch-content",
            sha: "branch-file-sha",
          },
        },
      },
    })

    const result = await resolveDraftSyncConflict(baseInput)

    expect(result.status).toBe("IN_REVIEW")
    expect(result.syncedMainSha).toBe("sha-main")
    expect(mockCreateOrUpdateFileContents).toHaveBeenCalledTimes(1)
  })

  it("retries when main changes during write and succeeds once stable", async () => {
    configureOctokitMocks({
      mainShaSequence: ["sha-1", "sha-2", "sha-2"],
      snapshots: {
        "sha-1": {
          "docs/topic.md": { content: "main-v1", sha: "main-v1-sha" },
        },
        "sha-2": {
          "docs/topic.md": { content: "main-v2", sha: "main-v2-sha" },
        },
        "submission-branch": {
          "docs/topic.md": {
            content: "branch-content",
            sha: "branch-file-sha",
          },
        },
      },
    })

    const result = await resolveDraftSyncConflict(baseInput)

    expect(result.status).toBe("IN_REVIEW")
    expect(result.syncedMainSha).toBe("sha-2")
    expect(mockCreateOrUpdateFileContents).toHaveBeenCalledTimes(2)
  })

  it("throws after max retries when main never stabilizes", async () => {
    configureOctokitMocks({
      mainShaSequence: ["sha-1", "sha-2", "sha-3", "sha-4", "sha-5", "sha-6"],
      snapshots: {
        "sha-1": {
          "docs/topic.md": { content: "main-v1", sha: "main-v1-sha" },
        },
        "sha-2": {
          "docs/topic.md": { content: "main-v2", sha: "main-v2-sha" },
        },
        "sha-3": {
          "docs/topic.md": { content: "main-v3", sha: "main-v3-sha" },
        },
        "sha-4": {
          "docs/topic.md": { content: "main-v4", sha: "main-v4-sha" },
        },
        "sha-5": {
          "docs/topic.md": { content: "main-v5", sha: "main-v5-sha" },
        },
        "sha-6": {
          "docs/topic.md": { content: "main-v6", sha: "main-v6-sha" },
        },
        "submission-branch": {
          "docs/topic.md": {
            content: "branch-content",
            sha: "branch-file-sha",
          },
        },
      },
    })

    await expect(resolveDraftSyncConflict(baseInput)).rejects.toThrow(
      "Max retries exceeded: main branch is too active"
    )
    expect(mockCreateOrUpdateFileContents).toHaveBeenCalledTimes(3)
  })

  it("returns SYNC_CONFLICT if retry re-merge finds conflict", async () => {
    configureOctokitMocks({
      mainShaSequence: ["sha-1", "sha-2", "sha-2"],
      snapshots: {
        "sha-old": {
          "docs/topic.md": { content: "line1\nline2", sha: "old-file-sha" },
        },
        "sha-1": {
          "docs/topic.md": { content: "line1\nline2", sha: "main-v1-sha" },
        },
        "sha-2": {
          "docs/topic.md": {
            content: "line1\nline2-main",
            sha: "main-v2-sha",
          },
        },
        "submission-branch": {
          "docs/topic.md": {
            content: "branch-content",
            sha: "branch-file-sha",
          },
        },
      },
    })

    const result = await resolveDraftSyncConflict({
      ...baseInput,
      content: "line1\nline2-draft",
      syncedMainSha: "sha-old",
    })

    expect(result.status).toBe("SYNC_CONFLICT")
    expect(result.conflictContent).toContain("<<<<<<< draft")
    expect(result.syncedMainSha).toBe("sha-2")
    expect(mockCreateOrUpdateFileContents).toHaveBeenCalledTimes(1)
  })
})
