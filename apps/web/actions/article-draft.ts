"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { getMainBranchHeadSha } from "@/lib/articles/branch"
import { requireAuth } from "@/lib/auth/context"
import {
  createDraftFile,
  deserializeDraftFilesPayload,
  normalizeDraftFileCollection,
  normalizeDraftFilePath,
} from "@/lib/drafts/files"
import { deleteDraftAssets } from "@/lib/drafts/storage"
import {
  deleteDraft,
  draftErrorMessage,
  newDraftFields,
  readDraft,
  requireDraftVersion,
  writeDraft,
} from "@/lib/drafts/store"
import { getRepoFileContent } from "@/lib/github/sync"

const saveDraftSchema = z.object({
  title: z.string().min(1, "Title is required"),
  draftFiles: z.string(),
  revisionId: z.string().optional(),
  etag: z.string().optional(),
})

export async function createDraftAction(formData: FormData): Promise<never> {
  const session = await requireAuth()
  const rawFilePath = formData.get("filePath")
  const normalizedPath = normalizeDraftFilePath(
    typeof rawFilePath === "string" ? rawFilePath : ""
  )
  if (normalizedPath.includes("..")) throw new Error("Invalid draft file path")
  let content = ""
  let filePath = normalizedPath
  if (normalizedPath) {
    const candidates = normalizedPath.endsWith(".md")
      ? [normalizedPath]
      : [normalizedPath, `${normalizedPath}.md`]
    const contents = await Promise.all(
      candidates.map((candidate) => getRepoFileContent(candidate))
    )
    const matchedIndex = contents.findIndex((value) => value !== null)
    if (matchedIndex >= 0) {
      content = contents[matchedIndex] ?? ""
      filePath = candidates[matchedIndex]
    }
  }
  const draft = {
    ...newDraftFields(session.user.id),
    ...normalizeDraftFileCollection({
      files: [createDraftFile({ content, filePath })],
    }),
    kind: "article" as const,
    baseMainSha: await getMainBranchHeadSha(),
    title: filePath || "Untitled article",
  }
  await writeDraft(draft)
  revalidatePath("/draft")
  redirect(`/draft/${draft.id}`)
}

export async function saveDraftAction(formData: FormData) {
  const session = await requireAuth()
  const validated = saveDraftSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }
  const { title, revisionId, etag } = validated.data
  const collection = deserializeDraftFilesPayload(validated.data.draftFiles)
  if (!collection) return { errors: { draftFiles: ["Invalid draft files"] } }
  try {
    if (revisionId) {
      const record = await readDraft(session.user.id, revisionId)
      if (!record || record.draft.kind !== "article") {
        throw new Error("Draft not found")
      }
      if (record.draft.status !== "DRAFT") {
        throw new Error("Cannot edit a draft after submission")
      }
      requireDraftVersion(record.etag, etag)
      const nextEtag = await writeDraft(
        {
          ...record.draft,
          ...collection,
          title,
          updatedAt: new Date().toISOString(),
        },
        record.etag
      )
      revalidatePath("/draft")
      return { success: true, revisionId, etag: nextEtag }
    }
    const draft = {
      ...newDraftFields(session.user.id),
      ...collection,
      kind: "article" as const,
      title,
      baseMainSha: await getMainBranchHeadSha(),
    }
    const nextEtag = await writeDraft(draft)
    revalidatePath("/draft")
    return { success: true, revisionId: draft.id, etag: nextEtag }
  } catch (error) {
    return { error: draftErrorMessage(error) }
  }
}

export async function deleteDraftAction(revisionId: string) {
  const session = await requireAuth()
  const record = await readDraft(session.user.id, revisionId)
  if (!record || record.draft.kind !== "article") {
    throw new Error("Draft not found")
  }
  if (record.draft.status !== "DRAFT") {
    throw new Error("Cannot delete a draft after submission has started")
  }
  await deleteDraft(record.draft, record.etag)
  await deleteDraftAssets(session.user.id, revisionId)
  revalidatePath("/draft")
  return { success: true }
}
