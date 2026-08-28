"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getMainBranchHeadSha } from "@/lib/articles/branch"
import {
  createDraftFile,
  deserializeDraftFilesPayload,
  normalizeDraftFileCollection,
  serializeDraftFilesForStorage,
} from "@/lib/drafts/files"
import { deleteDraftAsset } from "@/lib/drafts/storage"
import { getGithubPatForUser, requireAuth } from "@/lib/auth/context"
import { prisma } from "@/lib/prisma"
import {
  findDraftAssetsByRevision,
  markDraftAssetCleanupFailed,
  markDraftAssetDeleted,
  reconcileDraftAssetReferences,
} from "@/lib/drafts/asset-db"

const saveDraftSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().default(""),
  revisionId: z.string().nullable().default(null),
  filePath: z.string().nullable().default(null),
  activeFileId: z.string().nullable().default(null),
  draftFiles: z.string().nullable().default(null),
})

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

  const validated = saveDraftSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

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

    if (existing.status !== "DRAFT") {
      throw new Error("Cannot edit a draft after submission")
    }

    savedRevision = await prisma.revision.update({
      where: { id: revisionId },
      data: {
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
      filePath: nextDraftStorage.filePath || undefined,
      status: "DRAFT",
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

  if (existing.githubPrNum || existing.status !== "DRAFT") {
    throw new Error("Cannot delete a draft after submission has started")
  }

  const draftAssets = await findDraftAssetsByRevision(revisionId)

  await Promise.all(
    draftAssets.map(async (asset) => {
      try {
        await deleteDraftAsset(asset.storagePath)
        await markDraftAssetDeleted(asset.id)
      } catch (error) {
        await markDraftAssetCleanupFailed(
          asset.id,
          error instanceof Error ? error.message : "Unknown error"
        )
      }
    })
  )

  await prisma.revision.delete({
    where: { id: revisionId },
  })

  revalidatePath("/draft")
  return { success: true }
}
