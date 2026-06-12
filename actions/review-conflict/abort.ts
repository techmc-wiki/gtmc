"use server"

import type { Prisma } from "@prisma/client"
import { revalidatePaths } from "@/lib/revalidate-paths"
import { forcePushResolvedToPRBranch } from "@/lib/articles/conflict"
import { getMainBranchHeadSha } from "@/lib/articles/branch"
import { abortRebase } from "@/lib/articles/rebase"
import { decodeStoredDraftFiles } from "@/lib/drafts/files"
import { prisma } from "@/lib/prisma"
import type { ConflictMode } from "@/lib/review/review-types"
import { reviewLog, reviewError } from "@/lib/logging"
import {
  requireReviewAdminContext,
  getReviewRevalidatePaths,
} from "@/lib/review/admin-context"

export async function abortResolutionAction(revisionId: string) {
  reviewLog("abortResolutionAction", { revisionId, status: "start" })

  try {
    const { token } = await requireReviewAdminContext()

    const revision = await prisma.revision.findUnique({
      where: { id: revisionId },
    })

    if (!revision) {
      throw new Error("Revision not found")
    }

    const conflictMode = (revision as { conflictMode?: ConflictMode | null })
      .conflictMode

    reviewLog("abortResolutionAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "loaded",
      conflictMode,
    })

    if (conflictMode === "FINE_GRAINED") {
      reviewLog("abortResolutionAction", {
        revisionId,
        prNumber: revision.githubPrNum,
        status: "abort-rebase-start",
        mode: conflictMode,
      })
      await abortRebase({
        draftId: revisionId,
        token,
      })
      reviewLog("abortResolutionAction", {
        revisionId,
        prNumber: revision.githubPrNum,
        status: "abort-rebase-complete",
        mode: conflictMode,
      })
    }

    reviewLog("abortResolutionAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "db-write-before",
      fields:
        conflictMode === "SIMPLE"
          ? ["conflictContent", "status", "conflictMode"]
          : ["status", "conflictMode"],
      nextStatus: "IN_REVIEW",
      nextConflictMode: null,
    })
    await prisma.revision.update({
      where: { id: revisionId },
      data: {
        ...(conflictMode === "SIMPLE" ? { conflictContent: null } : {}),
        status: "IN_REVIEW",
        conflictMode: null,
      } as Prisma.RevisionUpdateInput,
    })
    reviewLog("abortResolutionAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "db-write-after",
      fields:
        conflictMode === "SIMPLE"
          ? ["conflictContent", "status", "conflictMode"]
          : ["status", "conflictMode"],
      nextStatus: "IN_REVIEW",
      nextConflictMode: null,
    })

    reviewLog("abortResolutionAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "force-push-start",
    })

    const storedDraftFiles = decodeStoredDraftFiles({
      content: revision.content,
      conflictContent: null,
      filePath: revision.filePath,
    })

    const revisionWithAuthor = await prisma.revision.findFirst({
      where: { id: revisionId },
      include: { author: { select: { name: true, email: true } } },
    })
    const submitterName = revisionWithAuthor?.author?.name ?? "gtmc-bot"
    const submitterEmail =
      revisionWithAuthor?.author?.email ?? "gtmc-bot@gtmc.dev"

    const latestMainSha = await getMainBranchHeadSha(token)

    if (revision.prBranchName) {
      await forcePushResolvedToPRBranch({
        resolvedFiles: storedDraftFiles.files.map((f) => ({
          filePath: f.filePath,
          content: f.content,
        })),
        prBranchName: revision.prBranchName,
        latestMainSha,
        commitMessage:
          "chore(review): restore draft branch after resolution abort",
        authorName: submitterName,
        authorEmail: submitterEmail,
        token,
      })

      reviewLog("abortResolutionAction", {
        revisionId,
        prNumber: revision.githubPrNum,
        status: "force-push-complete",
        prBranchName: revision.prBranchName,
      })
    }

    revalidatePaths(getReviewRevalidatePaths(revisionId, revision.githubPrNum))
    reviewLog("abortResolutionAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "complete",
      conflictMode,
    })
    return { success: true }
  } catch (error) {
    reviewError("abortResolutionAction", error, { revisionId, status: "error" })
    throw error
  }
}
