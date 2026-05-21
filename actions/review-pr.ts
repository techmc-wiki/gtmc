"use server"

import { revalidatePath } from "next/cache"
import { revalidatePaths } from "@/lib/revalidate-paths"
import { forcePushResolvedToPRBranch } from "@/lib/articles/conflict"
import { getMainBranchHeadSha } from "@/lib/articles/branch"
import { decodeStoredDraftFiles } from "@/lib/drafts/files"
import { getOctokit } from "@/lib/github/articles-repo"
import { reconcileDraftAssetsForPRCompletion } from "@/lib/drafts/asset-db"
import { mergePR } from "@/lib/github/pr-manager"
import { prisma } from "@/lib/prisma"
import type { RebaseState } from "@/lib/review/rebase-types"
import type { ConflictMode, ReviewMergeMethod } from "@/lib/review/review-types"
import { reviewLog, reviewError, summarizeSha } from "@/lib/review/logging"
import {
  requireReviewAdminContext,
  getReviewRevalidatePaths,
} from "@/lib/review/admin-context"
import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
} from "@/lib/github/articles-repo"

const owner = ARTICLES_REPO_OWNER
const repo = ARTICLES_REPO_NAME

function formatErrorMessage(message: string, error: unknown): string {
  if (error instanceof Error) {
    return `${message}: ${error.message}`
  }
  return message
}

export async function mergePRAction(
  prNumber: number,
  options?: {
    commitBody?: string
    commitTitle?: string
    mergeMethod?: ReviewMergeMethod
  }
) {
  const { token } = await requireReviewAdminContext()

  try {
    reviewLog("mergePRAction", {
      prNumber,
      status: "start",
      mergeMethod: options?.mergeMethod ?? "auto",
    })
    reviewLog("mergePRAction", {
      prNumber,
      status: "merge-dispatch",
      mergeMethod: options?.mergeMethod ?? "auto",
    })
    await mergePR(prNumber, options, token)
    reviewLog("mergePRAction", {
      prNumber,
      status: "github-api-after",
      operation: "mergePR",
      result: "completed",
    })
    try {
      reviewLog("mergePRAction", {
        prNumber,
        status: "reconcile-start",
        outcome: "PR-merged",
      })
      await reconcileDraftAssetsForPRCompletion({
        prNumber,
        outcome: "PR-merged",
      })
      reviewLog("mergePRAction", {
        prNumber,
        status: "reconcile-complete",
        outcome: "PR-merged",
      })
    } catch (reconcileError) {
      reviewError("mergePRAction", reconcileError, {
        prNumber,
        status: "reconcile-error",
        outcome: "PR-merged",
      })
    }
    revalidatePath("/draft")
    revalidatePath("/review")
    reviewLog("mergePRAction", { prNumber, status: "complete" })
    return { success: true }
  } catch (error) {
    reviewError("mergePRAction", error, { prNumber, status: "error" })
    throw new Error(formatErrorMessage("Merge failed", error))
  }
}

export async function closePRAction(prNumber: number) {
  const { token } = await requireReviewAdminContext()
  const octokit = getOctokit(token)

  try {
    reviewLog("closePRAction", { prNumber, status: "start" })
    reviewLog("closePRAction", {
      prNumber,
      status: "github-api-before",
      operation: "pulls.update",
      nextState: "closed",
    })
    await octokit.pulls.update({
      owner,
      repo,
      pull_number: prNumber,
      state: "closed",
    })
    reviewLog("closePRAction", {
      prNumber,
      status: "github-api-after",
      operation: "pulls.update",
      result: "closed",
    })
    try {
      reviewLog("closePRAction", {
        prNumber,
        status: "reconcile-start",
        outcome: "PR-closed",
      })
      await reconcileDraftAssetsForPRCompletion({
        prNumber,
        outcome: "PR-closed",
      })
      reviewLog("closePRAction", {
        prNumber,
        status: "reconcile-complete",
        outcome: "PR-closed",
      })
    } catch (reconcileError) {
      reviewError("closePRAction", reconcileError, {
        prNumber,
        status: "reconcile-error",
        outcome: "PR-closed",
      })
    }
    revalidatePath("/draft")
    revalidatePath("/review")
    reviewLog("closePRAction", { prNumber, status: "complete" })
    return { success: true }
  } catch (error) {
    reviewError("closePRAction", error, { prNumber, status: "error" })
    throw new Error(formatErrorMessage("Close failed", error))
  }
}

export async function finalizeReviewAction(
  prNumber: number,
  options?: {
    commitTitle?: string
    commitBody?: string
    mergeMethod?: ReviewMergeMethod
  }
) {
  reviewLog("finalizeReviewAction", {
    prNumber,
    status: "start",
    commitTitleProvided: Boolean(options?.commitTitle),
    commitBodyProvided: Boolean(options?.commitBody),
    mergeMethod: options?.mergeMethod ?? "auto",
  })

  try {
    const { token, authorName, authorEmail } = await requireReviewAdminContext()

    const revision = await prisma.revision.findFirst({
      where: { githubPrNum: prNumber },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!revision) {
      throw new Error("Linked draft not found")
    }

    const submitterName = revision.author?.name || authorName
    const submitterEmail = revision.author?.email || authorEmail

    const conflictMode = (revision as { conflictMode?: ConflictMode | null })
      .conflictMode
    const rebaseState = revision.rebaseState as RebaseState | null
    const storedDraftFiles = decodeStoredDraftFiles({
      content: revision.content,
      conflictContent: revision.conflictContent,
      filePath: revision.filePath,
    })

    reviewLog("finalizeReviewAction", {
      prNumber,
      revisionId: revision.id,
      status: "loaded",
      conflictMode,
      fileCount: storedDraftFiles.files.length,
    })

    if (conflictMode === "SIMPLE") {
      if (!revision.prBranchName || !revision.syncedMainSha) {
        throw new Error("The linked draft is missing PR metadata")
      }

      const hasSimpleConflictMarkers = (content: string) => {
        const SIMPLE_CONFLICT_MARKER_RE =
          /^<<<<<<< .*\n[\s\S]*?^=======\n[\s\S]*?^>>>>>>> .*$/gm
        SIMPLE_CONFLICT_MARKER_RE.lastIndex = 0
        return SIMPLE_CONFLICT_MARKER_RE.test(content)
      }

      if (
        storedDraftFiles.files.some((file) =>
          hasSimpleConflictMarkers(file.content)
        )
      ) {
        throw new Error("Resolve all simple conflicts before finalizing review")
      }

      reviewLog("finalizeReviewAction", {
        prNumber,
        status: "merge-pr-start",
        mode: conflictMode,
        mergeMethod: options?.mergeMethod ?? "auto",
      })
      await mergePR(
        prNumber,
        {
          mergeMethod: options?.mergeMethod,
          commitTitle: options?.commitTitle,
          commitBody: options?.commitBody,
        },
        token
      )
      reviewLog("finalizeReviewAction", {
        prNumber,
        status: "merge-pr-complete",
        mode: conflictMode,
      })
    } else {
      if (!revision.prBranchName) {
        throw new Error("The linked draft is missing PR metadata")
      }

      const latestMainSha = await getMainBranchHeadSha(token)
      const resolvedFiles =
        rebaseState?.fileStates &&
        Object.keys(rebaseState.fileStates).length > 0
          ? Object.values(rebaseState.fileStates).map((fileState) => ({
              filePath: fileState.filePath,
              content: fileState.currentContent,
            }))
          : storedDraftFiles.files.map((file) => ({
              filePath: file.filePath,
              content: file.content,
            }))

      reviewLog("finalizeReviewAction", {
        prNumber,
        status: "force-push-start",
        mode: conflictMode,
        prBranchName: revision.prBranchName,
        fileCount: resolvedFiles.length,
        latestMainSha: summarizeSha(latestMainSha),
      })
      await forcePushResolvedToPRBranch({
        resolvedFiles,
        prBranchName: revision.prBranchName,
        latestMainSha,
        authorName: submitterName,
        authorEmail: submitterEmail,
        token,
      })
      reviewLog("finalizeReviewAction", {
        prNumber,
        status: "force-push-complete",
        mode: conflictMode,
        prBranchName: revision.prBranchName,
      })

      reviewLog("finalizeReviewAction", {
        prNumber,
        status: "merge-pr-start",
        mode: conflictMode,
        mergeMethod: options?.mergeMethod ?? "auto",
      })
      await mergePR(
        prNumber,
        {
          mergeMethod: options?.mergeMethod,
          commitTitle: options?.commitTitle,
          commitBody: options?.commitBody,
        },
        token
      )
      reviewLog("finalizeReviewAction", {
        prNumber,
        status: "merge-pr-complete",
        mode: conflictMode,
      })
    }

    try {
      reviewLog("finalizeReviewAction", {
        prNumber,
        status: "db-cleanup-start",
        operation: "reconcileDraftAssetsForPRCompletion",
      })
      await reconcileDraftAssetsForPRCompletion({
        prNumber,
        outcome: "PR-merged",
      })
      reviewLog("finalizeReviewAction", {
        prNumber,
        status: "db-cleanup-complete",
        operation: "reconcileDraftAssetsForPRCompletion",
      })
    } catch (reconcileError) {
      reviewError("finalizeReviewAction", reconcileError, {
        prNumber,
        status: "db-cleanup-error",
        operation: "reconcileDraftAssetsForPRCompletion",
      })
    }

    revalidatePaths(getReviewRevalidatePaths(revision.id, prNumber))
    reviewLog("finalizeReviewAction", {
      prNumber,
      status: "complete",
      conflictMode,
    })
    return { success: true }
  } catch (error) {
    reviewError("finalizeReviewAction", error, { prNumber, status: "error" })
    throw error
  }
}
