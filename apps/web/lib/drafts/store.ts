import { BlobPreconditionFailedError, del, get, list, put } from "@vercel/blob"
import { randomUUID } from "node:crypto"
import { z } from "zod"
import { GLOSSARY_COLUMNS } from "@/lib/glossary/csv"

const fileSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  content: z.string(),
})
const rowSchema = z.record(z.enum(GLOSSARY_COLUMNS), z.string())
export const glossaryOperationsSchema = z.array(
  z.object({
    kind: z.enum(["edit", "add", "delete"]),
    slug: z.string(),
    before: rowSchema.optional(),
    after: rowSchema.optional(),
  })
)
const common = {
  id: z.string(),
  authorId: z.string(),
  title: z.string(),
  status: z.enum([
    "DRAFT",
    "PENDING",
    "SUBMITTED",
    "MERGED",
    "CLOSED",
    "ARCHIVED",
  ]),
  githubPrUrl: z.string().nullable(),
  githubPrNum: z.number().int().nullable(),
  branchName: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  submittedAt: z.string().datetime().nullable(),
}
export const draftSchema = z.discriminatedUnion("kind", [
  z.object({
    ...common,
    kind: z.literal("article"),
    baseMainSha: z.string().nullable(),
    activeFileId: z.string(),
    folders: z.array(z.string()),
    files: z.array(fileSchema),
  }),
  z.object({
    ...common,
    kind: z.literal("glossary"),
    operations: glossaryOperationsSchema,
  }),
])
export type Draft = z.infer<typeof draftSchema>
export type ArticleDraft = Extract<Draft, { kind: "article" }>
export type GlossaryDraft = Extract<Draft, { kind: "glossary" }>

export function draftBlobOptions() {
  const token = process.env.DRAFT_BLOB_READ_WRITE_TOKEN
  if (!token) {
    throw new Error(
      "Private draft storage is not configured (DRAFT_BLOB_READ_WRITE_TOKEN)"
    )
  }
  return { token }
}

export function draftPath(authorId: string, id: string) {
  for (const segment of [authorId, id]) {
    if (!/^[a-zA-Z0-9_-]+$/.test(segment)) {
      throw new Error("Invalid draft identifier")
    }
  }
  return `drafts/${authorId}/${id}.json`
}

export async function readDraft(authorId: string, id: string) {
  const result = await get(draftPath(authorId, id), {
    ...draftBlobOptions(),
    access: "private",
    useCache: false,
  })
  if (!result) return null
  const draft = draftSchema.parse(await new Response(result.stream).json())
  if (draft.authorId !== authorId || draft.id !== id) {
    throw new Error("Invalid draft ownership")
  }
  // Compressed reads weaken the HTTP ETag; conditional writes use its strong form.
  return { draft, etag: result.blob.etag.replace(/^W\//, "") }
}

export async function writeDraft(draft: Draft, etag?: string) {
  const blob = await put(
    draftPath(draft.authorId, draft.id),
    JSON.stringify(draftSchema.parse(draft)),
    {
      ...draftBlobOptions(),
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
      ...(etag ? { ifMatch: etag } : {}),
    }
  )
  return blob.etag
}

export async function listDrafts(authorId: string) {
  const prefix = draftPath(authorId, "prefix").replace("prefix.json", "")
  const paths: string[] = []
  let cursor: string | undefined
  do {
    // oxlint-disable-next-line no-await-in-loop -- each page needs the previous cursor
    const page = await list({ ...draftBlobOptions(), prefix, cursor })
    paths.push(...page.blobs.map((blob) => blob.pathname))
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  const drafts = await Promise.all(
    paths.map((pathname) =>
      readDraft(authorId, pathname.slice(prefix.length, -5))
    )
  )
  return drafts.flatMap((record) => (record ? [record.draft] : []))
}

export async function deleteDraft(draft: Draft, etag: string) {
  await del(draftPath(draft.authorId, draft.id), {
    ...draftBlobOptions(),
    ifMatch: etag,
  })
}

export function newDraftFields(authorId: string) {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    authorId,
    title: "",
    status: "DRAFT" as const,
    githubPrUrl: null,
    githubPrNum: null,
    branchName: null,
    createdAt: now,
    updatedAt: now,
    submittedAt: null,
  }
}

export function requireDraftVersion(
  actual: string,
  expected: string | null | undefined
) {
  if (actual !== expected) {
    throw new Error("This draft changed in another tab. Reload before saving.")
  }
}

export function draftErrorMessage(error: unknown) {
  return error instanceof BlobPreconditionFailedError
    ? "This draft changed while saving. Reload before trying again."
    : error instanceof Error
      ? error.message
      : "Draft operation failed"
}
