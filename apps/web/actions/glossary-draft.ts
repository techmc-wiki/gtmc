"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/context"
import {
  deleteDraft,
  draftErrorMessage,
  glossaryOperationsSchema,
  newDraftFields,
  readDraft,
  requireDraftVersion,
  writeDraft,
} from "@/lib/drafts/store"

export async function createGlossaryDraftAction(): Promise<{ id: string }> {
  const session = await requireAuth()
  const draft = {
    ...newDraftFields(session.user.id),
    kind: "glossary" as const,
    operations: [],
  }
  await writeDraft(draft)
  revalidatePath("/draft")
  return { id: draft.id }
}

export async function updateGlossaryDraftAction(
  id: string,
  operations: unknown[],
  title: string,
  etag: string
) {
  try {
    const session = await requireAuth()
    const validated = glossaryOperationsSchema.safeParse(operations)
    if (!validated.success) {
      return {
        success: false,
        errors: { operations: validated.error.issues.map((i) => i.message) },
      }
    }
    const record = await readDraft(session.user.id, id)
    if (!record || record.draft.kind !== "glossary") {
      throw new Error("Draft not found")
    }
    if (record.draft.status !== "DRAFT") {
      throw new Error("Cannot edit a draft after submission has started")
    }
    requireDraftVersion(record.etag, etag)
    const nextEtag = await writeDraft(
      {
        ...record.draft,
        operations: validated.data,
        title: title.trim(),
        updatedAt: new Date().toISOString(),
      },
      record.etag
    )
    revalidatePath("/draft")
    return { success: true, etag: nextEtag }
  } catch (error) {
    return { success: false, errors: { general: draftErrorMessage(error) } }
  }
}

export async function deleteGlossaryDraftAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAuth()
    const record = await readDraft(session.user.id, id)
    if (!record || record.draft.kind !== "glossary") {
      throw new Error("Draft not found")
    }
    if (record.draft.status !== "DRAFT") {
      throw new Error("Cannot delete a draft after submission has started")
    }
    await deleteDraft(record.draft, record.etag)
    revalidatePath("/draft")
    return { success: true }
  } catch (error) {
    return { success: false, error: draftErrorMessage(error) }
  }
}
