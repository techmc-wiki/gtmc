"use server"

import { revalidatePath } from "next/cache"

import { getMainBranchHeadSha } from "@/lib/articles/branch"
import { parseDraftTempImageRefs } from "@/lib/drafts/markdown"
import {
  createDraftFile,
  deserializeDraftFilesPayload,
  normalizeDraftFileCollection,
  serializeDraftFilesForStorage,
  type DraftFileRecord,
} from "@/lib/drafts/files"
import { deleteDraftAsset } from "@/lib/drafts/storage"
import { getGithubPatForUser, requireAuth } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import {
  findDraftAssetsByRevision,
  findFailedDraftAssets,
  markDraftAssetCleanupFailed,
  markDraftAssetDeleted,
  markDraftAssetOrphaned,
  markDraftAssetReferenced,
} from "@/lib/drafts/asset-db"

const EDITABLE_STATUSES = new Set(["DRAFT"])

async function reconcileDraftAssetReferences(
  revisionId: string,
  files: DraftFileRecord[]
) {
  const tempPrefix = process.env.DRAFT_STORAGE_TEMP_PREFIX ?? "draft-temp"
  const referencedStoragePaths = new Set<string>()

  for (const file of files) {
    const refs = parseDraftTempImageRefs(file.content, tempPrefix)
    for (const ref of refs) {
      referencedStoragePaths.add(ref.storagePath)
    }
  }

  await markDraftAssetReferenced(revisionId, [...referencedStoragePaths])
  await markDraftAssetOrphaned(revisionId, [...referencedStoragePaths])
}

export async function saveDraftAction(formData: FormData) {
  const session = await requireAuth()

  const userId = session.user.id

  const title = formData.get("title") as string
  const content = formData.get("content") as string
  const revisionId = formData.get("revisionId") as string | null
  const filePath = formData.get("filePath") as string | null
  const activeFileId = formData.get("activeFileId") as string | null
  const draftFilesPayload = formData.get("draftFiles") as string | null
  const token = await getGithubPatForUser(session.user.id)

  const draftFiles =
    deserializeDraftFilesPayload(draftFilesPayload) ||
    normalizeDraftFileCollection({
      activeFileId: activeFileId || undefined,
      files: [
        createDraftFile({
          content: content || "",
          filePath: filePath || "",
        }),
      ],
    })

  if (!title) {
    throw new Error("Title is required")
  }

  const nextDraftStorage = serializeDraftFilesForStorage(draftFiles)

  let savedRevision: { id: string }

  if (revisionId) {
    const existing = await prisma.revision.findUnique({
      where: { id: revisionId },
    })

    if (!existing) {
      throw new Error("Draft not found")
    }

    if (existing.authorId !== userId) {
      throw new Error("Unauthorized")
    }

    if (!EDITABLE_STATUSES.has(existing.status)) {
      throw new Error("Cannot edit a draft that is already in review")
    }

    savedRevision = await prisma.revision.update({
      where: { id: revisionId },
      data: {
        conflictContent: nextDraftStorage.conflictContent,
        content: nextDraftStorage.content,
        filePath: nextDraftStorage.filePath,
        title,
      },
    })

    await reconcileDraftAssetReferences(savedRevision.id, draftFiles.files)
  } else {
    const baseMainSha = await getMainBranchHeadSha(token)
    const createData: Parameters<typeof prisma.revision.create>[0]["data"] = {
      baseMainSha,
      content: nextDraftStorage.content,
      ...(nextDraftStorage.conflictContent
        ? { conflictContent: nextDraftStorage.conflictContent }
        : {}),
      filePath: nextDraftStorage.filePath || undefined,
      status: "DRAFT",
      syncedMainSha: baseMainSha,
      title,
      author: { connect: { id: userId } },
    }

    savedRevision = await prisma.revision.create({
      data: createData,
    })

    await reconcileDraftAssetReferences(savedRevision.id, draftFiles.files)
  }

  revalidatePath("/draft")
  return { success: true, revisionId: savedRevision.id }
}

export async function deleteDraftAction(revisionId: string) {
  const session = await requireAuth()

  const userId = session.user.id
  const existing = await prisma.revision.findUnique({
    where: { id: revisionId },
  })

  if (!existing) {
    throw new Error("Draft not found")
  }

  if (existing.authorId !== userId) {
    throw new Error("Unauthorized to delete this draft")
  }

  if (
    existing.githubPrNum ||
    existing.status === "IN_REVIEW" ||
    existing.status === "SYNC_CONFLICT"
  ) {
    throw new Error("Cannot delete a draft after a PR has been opened")
  }

  const draftAssets = await findDraftAssetsByRevision(revisionId)

  for (const asset of draftAssets) {
    try {
      await deleteDraftAsset(asset.storagePath)
      await markDraftAssetDeleted(asset.id)
    } catch (error) {
      await markDraftAssetCleanupFailed(
        asset.id,
        error instanceof Error ? error.message : "Unknown error"
      )
    }
  }

  await prisma.revision.delete({
    where: { id: revisionId },
  })

  revalidatePath("/draft")
  return { success: true }
}

export async function retryCleanupAction(revisionId: string) {
  const session = await requireAuth()

  if (!revisionId) {
    throw new Error("Revision ID is required")
  }

  const existing = await prisma.revision.findUnique({
    where: { id: revisionId },
    select: { authorId: true },
  })

  if (!existing) {
    throw new Error("Revision not found")
  }

  if (existing.authorId !== session.user.id) {
    throw new Error("Unauthorized")
  }

  const failedAssets = await findFailedDraftAssets(revisionId)

  let cleaned = 0
  let failed = 0

  for (const asset of failedAssets) {
    try {
      await deleteDraftAsset(asset.storagePath)
      await markDraftAssetDeleted(asset.id)
      cleaned += 1
    } catch (error) {
      await markDraftAssetCleanupFailed(
        asset.id,
        error instanceof Error ? error.message : "Unknown error"
      )
      failed += 1
    }
  }

  revalidatePath("/draft")
  return { success: true, cleaned, failed }
}
