import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import { reviewLog, summarizeSha } from "@/lib/logging"
import type {
  ReviewMergeMethod,
  ReviewMergeStrategyAnalysis,
} from "@/lib/review/review-types"
import { getPR } from "./pr-operations"

export function analyzeReviewMergeStrategy(pr: {
  commits: number
  changed_files: number
  additions: number
  deletions: number
}): ReviewMergeStrategyAnalysis {
  const totalChanges = pr.additions + pr.deletions

  if (pr.commits <= 2 && pr.changed_files <= 3 && totalChanges <= 120) {
    return {
      recommendation: "direct",
      availableMethods: ["direct", "squash", "rebase"],
      rationale:
        "Small pull request with short history. Direct landing keeps the original branch commit chain without creating a merge commit.",
    }
  }

  if (pr.commits >= 6 || pr.changed_files >= 10 || totalChanges >= 500) {
    return {
      recommendation: "rebase",
      availableMethods: ["rebase", "squash", "direct"],
      rationale:
        "Large or long-running pull request. Rebase keeps the commit sequence readable while still avoiding merge commits.",
    }
  }

  return {
    recommendation: "squash",
    availableMethods: ["squash", "rebase", "direct"],
    rationale:
      "Medium-sized pull request. Squash keeps main history compact while preserving authorship in the commit body.",
  }
}

export async function determineReviewMergeMethod(
  prNumber: number,
  token?: string
): Promise<ReviewMergeMethod> {
  const pr = await getPR(prNumber, token)
  return analyzeReviewMergeStrategy(pr).recommendation
}

export async function determineMergeMethod(
  prNumber: number,
  token?: string
): Promise<"squash" | "rebase"> {
  const recommended = await determineReviewMergeMethod(prNumber, token)

  if (recommended === "rebase") {
    return "rebase"
  }
  return "squash"
}

async function landPullRequestDirectly(
  prNumber: number,
  token?: string
): Promise<{ merged: boolean; message: string; sha: string | null }> {
  const octokit = getOctokit(token)
  const pr = await getPR(prNumber, token)

  if (pr.base.ref !== "main") {
    throw new Error(
      "Direct landing is only supported for pull requests targeting main"
    )
  }

  reviewLog("landPullRequestDirectly", {
    prNumber,
    status: "start",
    headSha: summarizeSha(pr.head.sha),
  })

  const { data: mainRef } = await octokit.git.getRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: "heads/main",
  })

  reviewLog("landPullRequestDirectly", {
    prNumber,
    status: "github-api-before",
    operation: "git.updateRef",
    mainSha: summarizeSha(mainRef.object.sha),
    nextSha: summarizeSha(pr.head.sha),
  })

  await octokit.git.updateRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: "heads/main",
    sha: pr.head.sha,
    force: false,
  })

  reviewLog("landPullRequestDirectly", {
    prNumber,
    status: "complete",
    sha: summarizeSha(pr.head.sha),
  })

  return {
    merged: true,
    message: "Pull request landed directly on main",
    sha: pr.head.sha,
  }
}

export async function mergePR(
  prNumber: number,
  options?: {
    commitBody?: string
    commitTitle?: string
    mergeMethod?: ReviewMergeMethod
  },
  token?: string
) {
  const actualMergeMethod =
    options?.mergeMethod || (await determineReviewMergeMethod(prNumber, token))

  if (actualMergeMethod === "direct") {
    return landPullRequestDirectly(prNumber, token)
  }

  const octokit = getOctokit(token)

  reviewLog("mergePR", {
    prNumber,
    status: "start",
    mergeMethod: actualMergeMethod,
    commitTitleProvided: Boolean(options?.commitTitle),
    commitBodyProvided: Boolean(options?.commitBody),
  })
  reviewLog("mergePR", {
    prNumber,
    status: "github-api-before",
    operation: "pulls.merge",
    mergeMethod: actualMergeMethod,
  })
  const { data } = await octokit.pulls.merge({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    pull_number: prNumber,
    merge_method: actualMergeMethod,
    ...(actualMergeMethod === "squash" && options?.commitTitle
      ? { commit_title: options.commitTitle }
      : {}),
    ...(actualMergeMethod === "squash" && options?.commitBody
      ? { commit_message: options.commitBody }
      : {}),
  })

  reviewLog("mergePR", {
    prNumber,
    status: "complete",
    mergeMethod: actualMergeMethod,
    merged: data.merged,
    sha: summarizeSha(data.sha),
  })

  return data
}
