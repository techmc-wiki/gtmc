"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getMainBranchHeadSha } from "@/lib/articles/branch"
import { getGithubPatForUser, requireAuth } from "@/lib/auth/context"
import {
  findDraftAssetsByRevision,
  markDraftAssetCleanupFailed,
  markDraftAssetDeleted,
  reconcileDraftAssetReferences,
} from "@/lib/drafts/asset-db"
import {
  createDraftFile,
  deserializeDraftFilesPayload,
  normalizeDraftFileCollection,
  normalizeDraftFilePath,
  serializeDraftFilesForStorage,
} from "@/lib/drafts/files"
import { deleteDraftAsset } from "@/lib/drafts/storage"
import { getRepoFileContent } from "@/lib/github/sync"
import { prisma } from "@/lib/prisma"

const saveDraftSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().default(""),
  revisionId: z.string().nullable().default(null),
  filePath: z.string().nullable().default(null),
  activeFileId: z.string().nullable().default(null),
  draftFiles: z.string().nullable().default(null),
})
export async function createDraftAction(formData: FormData): Promise<never> {
  const session = await requireAuth()
  const rawFilePath = formData.get("filePath")
  const normalizedPath = normalizeDraftFilePath(
    typeof rawFilePath === "string" ? rawFilePath : ""
  )
  if (normalizedPath.includes("..")) {
    throw new Error("Invalid draft file path")
  }

  let content = ""
  let resolvedFilePath = normalizedPath
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
      resolvedFilePath = candidates[matchedIndex]
    }
  }

  const token =
    (await getGithubPatForUser(session.user.id)) ?? process.env.GITHUB_TOKEN
  const draft = await prisma.revision.create({
    data: {
      author: { connect: { id: session.user.id } },
      baseMainSha: await getMainBranchHeadSha(token),
      content,
      filePath: resolvedFilePath || undefined,
      status: "DRAFT",
      title: resolvedFilePath || "Untitled article",
    },
  })

  revalidatePath("/draft")
  redirect(`/draft/${draft.id}`)
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
