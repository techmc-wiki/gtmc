"use server"

import { Prisma } from "@prisma/client"
import { revalidatePaths } from "@/lib/revalidate-paths"
import { upsertFileOnBranch } from "@/lib/articles/branch"
import {
  decodeStoredDraftFiles,
  getActiveDraftFile,
  serializeDraftFilesForStorage,
} from "@/lib/drafts/files"
import { prisma } from "@/lib/prisma"
import { requireReviewAdminContext } from "@/lib/review/admin-context"

export async function keepFileAction(revisionId: string) {
  const { token, authorName, authorEmail } = await requireReviewAdminContext()

  const revision = await prisma.revision.findUnique({
    where: { id: revisionId },
  })

  if (!revision) {
    throw new Error("Revision not found")
  }

  const storedDraftFiles = decodeStoredDraftFiles({
    content: revision.content,
    conflictContent: revision.conflictContent,
    filePath: revision.filePath,
  })

  if (storedDraftFiles.files.length !== 1) {
    throw new Error("Keep file only supports single-file drafts")
  }

  const draftFile = getActiveDraftFile(storedDraftFiles)

  if (!draftFile.filePath || !revision.prBranchName) {
    throw new Error("The revision is missing PR metadata")
  }

  await upsertFileOnBranch({
    authorEmail,
    authorName,
    branchName: revision.prBranchName,
    content: draftFile.content,
    filePath: draftFile.filePath,
    message: `docs: keep file despite deletion in main for ${revision.title}`,
    token,
  })

  const keptDraftStorage = serializeDraftFilesForStorage({
    activeFileId: storedDraftFiles.activeFileId,
    folders: storedDraftFiles.folders || [],
    files: [
      {
        ...draftFile,
        conflictContent: undefined,
      },
    ],
  })

  await prisma.revision.update({
    where: { id: revisionId },
    data: {
      status: "IN_REVIEW",
      conflictContent: keptDraftStorage.conflictContent,
      content: keptDraftStorage.content,
      filePath: keptDraftStorage.filePath,
      rebaseState: Prisma.DbNull,
    },
  })

  revalidatePaths(
    [
      "/draft",
      `/draft/${revisionId}`,
      "/review",
      revision.githubPrNum ? `/review/${revision.githubPrNum}` : "",
    ].filter(Boolean)
  )

  return { success: true }
}
