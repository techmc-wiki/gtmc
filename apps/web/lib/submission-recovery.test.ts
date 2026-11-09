import {
  afterAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vite-plus/test"

import {
  canEditDraft,
  canSubmitDraft,
  deriveDisplayStatus,
  isEditableDraftStatus,
  isSubmissionLocked,
  isTerminalDraftStatus,
} from "@/lib/drafts/lifecycle"
import {
  type ArticleDraft,
  type Draft,
  type GlossaryDraft,
  draftPath,
  readDraft,
  writeDraft,
} from "@/lib/drafts/store"
import { GLOSSARY_COLUMNS, type GlossaryRow } from "@/lib/glossary/csv"
import type { DraftPullRequestResult } from "@/lib/articles/pr"
import { reconcileSubmission } from "@/lib/submission-recovery"

/**
 * An in-memory stand-in for the private Vercel Blob store. Only the wire
 * behaviour the draft store relies on is modelled: read, conditional write,
 * conditional delete, and list. Draft parsing, ETag propagation, and lifecycle
 * transitions all run as production code.
 */
const blobState = vi.hoisted(() => {
  class BlobPreconditionFailedError extends Error {
    constructor() {
      super("The blob was modified or deleted since it was last read")
      this.name = "BlobPreconditionFailedError"
    }
  }

  interface StoredBlob {
    body: string
    etag: string
  }

  const entries = new Map<string, StoredBlob>()
  const weakReads = new Set<string>()
  let counter = 0

  function nextEtag() {
    counter += 1
    return `"etag-${counter}"`
  }

  const get = vi.fn(async (pathname: string) => {
    const blob = entries.get(pathname)
    if (!blob) return null
    return {
      stream: new Response(blob.body).body,
      blob: {
        // Compressed reads report the weak form; the stored value stays strong.
        etag: weakReads.has(pathname) ? `W/${blob.etag}` : blob.etag,
        pathname,
        url: `https://blob.example/${pathname}`,
        size: blob.body.length,
        uploadedAt: new Date(0),
      },
    }
  })

  const put = vi.fn(
    async (pathname: string, body: string, options?: { ifMatch?: string }) => {
      const current = entries.get(pathname)
      if (options?.ifMatch !== undefined && current?.etag !== options.ifMatch) {
        throw new BlobPreconditionFailedError()
      }
      const blob = { body, etag: nextEtag() }
      entries.set(pathname, blob)
      return {
        etag: blob.etag,
        pathname,
        url: `https://blob.example/${pathname}`,
      }
    }
  )

  const del = vi.fn(
    async (pathname: string, options?: { ifMatch?: string }) => {
      const current = entries.get(pathname)
      if (options?.ifMatch !== undefined && current?.etag !== options.ifMatch) {
        throw new BlobPreconditionFailedError()
      }
      entries.delete(pathname)
      return { pathname }
    }
  )

  const list = vi.fn(async (options?: { prefix?: string }) => {
    const prefix = options?.prefix ?? ""
    const blobs = [...entries.entries()]
      .filter(([pathname]) => pathname.startsWith(prefix))
      .map(([pathname, blob]) => ({
        pathname,
        etag: blob.etag,
        url: `https://blob.example/${pathname}`,
      }))
    return { blobs, hasMore: false, cursor: undefined }
  })

  function reset() {
    entries.clear()
    weakReads.clear()
    counter = 0
  }

  return {
    entries,
    weakReads,
    get,
    put,
    del,
    list,
    reset,
    BlobPreconditionFailedError,
  }
})

vi.mock("@vercel/blob", () => ({
  BlobPreconditionFailedError: blobState.BlobPreconditionFailedError,
  del: blobState.del,
  get: blobState.get,
  list: blobState.list,
  put: blobState.put,
}))

/** Remote GitHub lookups are the only stubbed boundary besides blob storage. */
const github = vi.hoisted(() => ({
  findArticlePullRequestByBranch: vi.fn(),
  findGlossaryPullRequestByBranch: vi.fn(),
}))

vi.mock("@/lib/articles/pr", () => ({
  findArticlePullRequestByBranch: github.findArticlePullRequestByBranch,
}))

vi.mock("@/lib/glossary/pr", () => ({
  findGlossaryPullRequestByBranch: github.findGlossaryPullRequestByBranch,
}))

const AUTHOR_ID = "author-1"
const DRAFT_ID = "draft-1"
const FIXTURE_CREATED_AT = "2020-01-01T00:00:00.000Z"
const FIXTURE_UPDATED_AT = "2020-01-02T00:00:00.000Z"
const ORIGINAL_BLOB_STORE_ID = process.env.DRAFT_BLOB_STORE_ID

function glossaryRow(overrides: Partial<GlossaryRow> = {}): GlossaryRow {
  const row = Object.fromEntries(
    GLOSSARY_COLUMNS.map((column) => [column, ""])
  ) as GlossaryRow
  return Object.assign(row, overrides)
}

function articleDraft(overrides: Partial<ArticleDraft> = {}): ArticleDraft {
  return {
    id: DRAFT_ID,
    authorId: AUTHOR_ID,
    kind: "article",
    title: "Gamma guide",
    status: "PENDING",
    githubPrUrl: null,
    githubPrNum: null,
    branchName: "article-draft-gamma",
    createdAt: FIXTURE_CREATED_AT,
    updatedAt: FIXTURE_UPDATED_AT,
    submittedAt: null,
    baseMainSha: "base-sha",
    activeFileId: "file-1",
    folders: ["guides"],
    files: [
      { id: "file-1", filePath: "guides/intro.md", content: "# Intro" },
      { id: "file-2", filePath: "guides/setup.md", content: "# Setup" },
    ],
    ...overrides,
  }
}

function glossaryDraft(overrides: Partial<GlossaryDraft> = {}): GlossaryDraft {
  return {
    id: DRAFT_ID,
    authorId: AUTHOR_ID,
    kind: "glossary",
    title: "Glossary update",
    status: "PENDING",
    githubPrUrl: null,
    githubPrNum: null,
    branchName: "glossary-draft-gamma",
    createdAt: FIXTURE_CREATED_AT,
    updatedAt: FIXTURE_UPDATED_AT,
    submittedAt: null,
    operations: [
      {
        kind: "edit",
        slug: "gamma",
        before: glossaryRow({ "Short Form": "Gamma", Chinese: "伽马" }),
        after: glossaryRow({ "Short Form": "Gamma", Chinese: "伽玛" }),
      },
      {
        kind: "add",
        slug: "delta",
        after: glossaryRow({ "Short Form": "Delta", Chinese: "德尔塔" }),
      },
    ],
    ...overrides,
  }
}

function expectArticleDraft(draft: Draft): ArticleDraft {
  if (draft.kind !== "article") {
    throw new Error(`Expected an article draft, received ${draft.kind}`)
  }
  return draft
}

function expectGlossaryDraft(draft: Draft): GlossaryDraft {
  if (draft.kind !== "glossary") {
    throw new Error(`Expected a glossary draft, received ${draft.kind}`)
  }
  return draft
}

async function readStoredDraft() {
  const record = await readDraft(AUTHOR_ID, DRAFT_ID)
  if (!record) throw new Error("Expected the draft to exist")
  return record
}

beforeEach(() => {
  process.env.DRAFT_BLOB_STORE_ID = "store_test"
  vi.clearAllMocks()
  blobState.reset()
  github.findArticlePullRequestByBranch.mockReset()
  github.findGlossaryPullRequestByBranch.mockReset()
})

afterAll(() => {
  if (ORIGINAL_BLOB_STORE_ID === undefined) {
    delete process.env.DRAFT_BLOB_STORE_ID
  } else {
    process.env.DRAFT_BLOB_STORE_ID = ORIGINAL_BLOB_STORE_ID
  }
})

describe("reconcileSubmission", () => {
  test("releases a pending article draft without a PR", async () => {
    const fixture = articleDraft()
    const initialEtag = await writeDraft(fixture)
    github.findArticlePullRequestByBranch.mockResolvedValue(null)

    const recovered = await reconcileSubmission({
      kind: "article",
      authorId: AUTHOR_ID,
      draftId: DRAFT_ID,
      token: "article-token",
    })

    expect(recovered).toBeNull()
    expect(github.findArticlePullRequestByBranch).toHaveBeenCalledWith(
      fixture.branchName,
      "article-token"
    )

    const record = await readStoredDraft()
    expect(record.etag).not.toBe(initialEtag)
    const draft = expectArticleDraft(record.draft)
    expect(draft).toMatchObject({
      status: "DRAFT",
      branchName: fixture.branchName,
      githubPrNum: null,
      githubPrUrl: null,
      submittedAt: null,
      activeFileId: fixture.activeFileId,
      folders: fixture.folders,
      files: fixture.files,
      baseMainSha: fixture.baseMainSha,
    })
    expect(draft.updatedAt).not.toBe(FIXTURE_UPDATED_AT)
    expect(isSubmissionLocked(draft.status)).toBe(false)
    expect(isEditableDraftStatus(draft.status)).toBe(true)
    expect(canSubmitDraft(draft)).toBe(true)
  })

  test("releases a pending glossary draft without a PR", async () => {
    const fixture = glossaryDraft()
    await writeDraft(fixture)
    github.findGlossaryPullRequestByBranch.mockResolvedValue(null)

    const recovered = await reconcileSubmission({
      kind: "glossary",
      authorId: AUTHOR_ID,
      draftId: DRAFT_ID,
      token: "glossary-token",
    })

    expect(recovered).toBeNull()
    expect(github.findGlossaryPullRequestByBranch).toHaveBeenCalledWith(
      fixture.branchName,
      "glossary-token"
    )
    expect(github.findArticlePullRequestByBranch).not.toHaveBeenCalled()

    const draft = expectGlossaryDraft((await readStoredDraft()).draft)
    expect(draft).toMatchObject({
      status: "DRAFT",
      branchName: fixture.branchName,
      githubPrNum: null,
      githubPrUrl: null,
      submittedAt: null,
      operations: fixture.operations,
    })
    expect(isSubmissionLocked(draft.status)).toBe(false)
    expect(canSubmitDraft(draft)).toBe(true)
  })

  test("finalizes a glossary draft that already has a PR", async () => {
    const fixture = glossaryDraft()
    await writeDraft(fixture)
    const prUrl = "https://github.com/gtmc/glossary/pull/77"
    github.findGlossaryPullRequestByBranch.mockResolvedValue({
      number: 77,
      html_url: prUrl,
    })

    const recovered = await reconcileSubmission({
      kind: "glossary",
      authorId: AUTHOR_ID,
      draftId: DRAFT_ID,
      token: "glossary-token",
    })

    expect(recovered).toEqual({ prNumber: 77, prUrl })

    const draft = expectGlossaryDraft((await readStoredDraft()).draft)
    expect(draft).toMatchObject({
      status: "SUBMITTED",
      branchName: fixture.branchName,
      githubPrNum: 77,
      githubPrUrl: prUrl,
      operations: fixture.operations,
    })
    expect(draft.submittedAt).toEqual(expect.any(String))
    expect(Number.isNaN(Date.parse(draft.submittedAt ?? ""))).toBe(false)
    expect(Number.isNaN(Date.parse(draft.updatedAt))).toBe(false)
    expect(draft.updatedAt).not.toBe(FIXTURE_UPDATED_AT)
    expect(isTerminalDraftStatus(draft.status)).toBe(true)
    expect(canEditDraft(draft)).toBe(false)
    expect(
      deriveDisplayStatus(draft.status, { state: "closed", merged: true })
    ).toBe("MERGED")
  })

  test("finalizes an article draft from a supplied result", async () => {
    const fixture = articleDraft()
    await writeDraft(fixture)
    const prUrl = "https://github.com/gtmc/articles/pull/9"
    const resolvedFiles = [
      { id: "file-1", filePath: "03-guides/intro.md", content: "# Intro" },
      { id: "file-2", filePath: "03-guides/setup.md", content: "# Setup" },
    ]
    const result: DraftPullRequestResult = {
      activeFileId: "file-2",
      files: resolvedFiles,
      prNumber: 9,
      prUrl,
    }

    const recovered = await reconcileSubmission({
      kind: "article",
      authorId: AUTHOR_ID,
      draftId: DRAFT_ID,
      token: "article-token",
      result,
    })

    expect(recovered?.prNumber).toBe(9)
    expect(recovered?.prUrl).toBe(prUrl)
    expect(github.findArticlePullRequestByBranch).not.toHaveBeenCalled()
    expect(github.findGlossaryPullRequestByBranch).not.toHaveBeenCalled()

    const draft = expectArticleDraft((await readStoredDraft()).draft)
    expect(draft).toMatchObject({
      status: "SUBMITTED",
      activeFileId: "file-2",
      files: resolvedFiles,
      baseMainSha: fixture.baseMainSha,
      folders: fixture.folders,
      branchName: fixture.branchName,
      githubPrNum: 9,
      githubPrUrl: prUrl,
    })
    expect(draft.submittedAt).toEqual(expect.any(String))
    expect(Number.isNaN(Date.parse(draft.submittedAt ?? ""))).toBe(false)
    expect(Number.isNaN(Date.parse(draft.updatedAt))).toBe(false)
    expect(draft.updatedAt).not.toBe(FIXTURE_UPDATED_AT)
    expect(isTerminalDraftStatus(draft.status)).toBe(true)
  })

  test("finalizes when the blob read returns a weak ETag", async () => {
    const fixture = glossaryDraft()
    await writeDraft(fixture)
    // The blob is stored with a strong ETag; compressed reads report `W/…`.
    blobState.weakReads.add(draftPath(AUTHOR_ID, DRAFT_ID))
    const prUrl = "https://github.com/gtmc/glossary/pull/81"
    github.findGlossaryPullRequestByBranch.mockResolvedValue({
      number: 81,
      html_url: prUrl,
    })

    const recovered = await reconcileSubmission({
      kind: "glossary",
      authorId: AUTHOR_ID,
      draftId: DRAFT_ID,
      token: "glossary-token",
    })

    expect(recovered).toEqual({ prNumber: 81, prUrl })
    const draft = expectGlossaryDraft((await readStoredDraft()).draft)
    expect(draft).toMatchObject({
      status: "SUBMITTED",
      branchName: fixture.branchName,
      githubPrNum: 81,
      githubPrUrl: prUrl,
    })
    expect(draft.submittedAt).toEqual(expect.any(String))
    expect(draft.updatedAt).not.toBe(FIXTURE_UPDATED_AT)
  })

  test("leaves a glossary draft pending for an article attempt", async () => {
    const fixture = glossaryDraft()
    const initialEtag = await writeDraft(fixture)

    const recovered = await reconcileSubmission({
      kind: "article",
      authorId: AUTHOR_ID,
      draftId: DRAFT_ID,
      token: "article-token",
    })

    expect(recovered).toBeNull()
    expect(github.findArticlePullRequestByBranch).not.toHaveBeenCalled()
    expect(github.findGlossaryPullRequestByBranch).not.toHaveBeenCalled()

    const record = await readStoredDraft()
    expect(record.etag).toBe(initialEtag)
    expect(record.draft).toMatchObject({
      kind: "glossary",
      status: "PENDING",
      branchName: fixture.branchName,
      githubPrNum: null,
      submittedAt: null,
      updatedAt: FIXTURE_UPDATED_AT,
    })
    expect(isSubmissionLocked(record.draft.status)).toBe(true)
  })

  test("leaves an article draft pending for a glossary attempt", async () => {
    const fixture = articleDraft()
    const initialEtag = await writeDraft(fixture)

    const recovered = await reconcileSubmission({
      kind: "glossary",
      authorId: AUTHOR_ID,
      draftId: DRAFT_ID,
      token: "glossary-token",
    })

    expect(recovered).toBeNull()
    expect(github.findArticlePullRequestByBranch).not.toHaveBeenCalled()
    expect(github.findGlossaryPullRequestByBranch).not.toHaveBeenCalled()

    const record = await readStoredDraft()
    expect(record.etag).toBe(initialEtag)
    expect(record.draft).toMatchObject({
      kind: "article",
      status: "PENDING",
      branchName: fixture.branchName,
      githubPrNum: null,
      submittedAt: null,
      updatedAt: FIXTURE_UPDATED_AT,
      files: fixture.files,
    })
    expect(isSubmissionLocked(record.draft.status)).toBe(true)
  })

  test("does not reconcile a draft that is no longer pending", async () => {
    const fixture = articleDraft({ status: "DRAFT" })
    const initialEtag = await writeDraft(fixture)

    const recovered = await reconcileSubmission({
      kind: "article",
      authorId: AUTHOR_ID,
      draftId: DRAFT_ID,
      token: "article-token",
    })

    expect(recovered).toBeNull()
    expect(github.findArticlePullRequestByBranch).not.toHaveBeenCalled()
    expect(github.findGlossaryPullRequestByBranch).not.toHaveBeenCalled()

    const record = await readStoredDraft()
    expect(record.etag).toBe(initialEtag)
    expect(record.draft).toMatchObject({
      status: "DRAFT",
      githubPrNum: null,
      submittedAt: null,
      updatedAt: FIXTURE_UPDATED_AT,
    })
  })

  test("rejects an ETag conflict without clobbering data", async () => {
    const fixture = articleDraft({ branchName: "article-draft-conflict" })
    await writeDraft(fixture)
    const concurrent = articleDraft({
      branchName: fixture.branchName,
      title: "Edited in another tab",
      updatedAt: "2021-02-02T00:00:00.000Z",
    })

    // Another tab saves between this attempt's read and its finalize write.
    github.findArticlePullRequestByBranch.mockImplementation(async () => {
      blobState.entries.set(draftPath(AUTHOR_ID, DRAFT_ID), {
        body: JSON.stringify(concurrent),
        etag: '"etag-concurrent"',
      })
      return {
        number: 42,
        html_url: "https://github.com/gtmc/articles/pull/42",
      }
    })

    await expect(
      reconcileSubmission({
        kind: "article",
        authorId: AUTHOR_ID,
        draftId: DRAFT_ID,
        token: "article-token",
      })
    ).rejects.toBeInstanceOf(blobState.BlobPreconditionFailedError)

    const record = await readStoredDraft()
    expect(record.etag).toBe('"etag-concurrent"')
    expect(record.draft).toMatchObject({
      title: "Edited in another tab",
      status: "PENDING",
      githubPrNum: null,
      githubPrUrl: null,
      updatedAt: "2021-02-02T00:00:00.000Z",
    })
  })

  test("propagates a lookup failure without releasing the draft", async () => {
    const fixture = articleDraft()
    const initialEtag = await writeDraft(fixture)
    github.findArticlePullRequestByBranch.mockRejectedValue(
      new Error("GitHub is unavailable")
    )

    await expect(
      reconcileSubmission({
        kind: "article",
        authorId: AUTHOR_ID,
        draftId: DRAFT_ID,
        token: "article-token",
      })
    ).rejects.toThrow("GitHub is unavailable")

    expect(github.findGlossaryPullRequestByBranch).not.toHaveBeenCalled()

    const record = await readStoredDraft()
    expect(record.etag).toBe(initialEtag)
    expect(record.draft).toMatchObject({
      status: "PENDING",
      branchName: fixture.branchName,
      githubPrNum: null,
      githubPrUrl: null,
      submittedAt: null,
      updatedAt: FIXTURE_UPDATED_AT,
    })
    expect(isSubmissionLocked(record.draft.status)).toBe(true)
  })
})
