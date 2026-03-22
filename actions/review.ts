"use server"

import { auth } from "@/lib/auth"
import {
  getOctokit,
  ARTICLES_REPO_OWNER,
  ARTICLES_REPO_NAME,
} from "@/lib/github-pr"
import { revalidatePath } from "next/cache"

const owner = ARTICLES_REPO_OWNER
const repo = ARTICLES_REPO_NAME

export async function mergePRAction(prNumber: number) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  const token = process.env.GITHUB_ARTICLES_WRITE_PAT
  const octokit = getOctokit(token)

  try {
    await octokit.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
    })
    revalidatePath("/review")
    return { success: true }
  } catch (error) {
    throw new Error(
      `Merge failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

export async function resolveConflictAction(
  prNumber: number,
  formData: FormData,
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  const token = process.env.GITHUB_ARTICLES_WRITE_PAT
  const octokit = getOctokit(token)

  const filePath = formData.get("filePath") as string
  const content = formData.get("content") as string

  if (!filePath || !content) {
    throw new Error("File path and content are required")
  }

  try {
    const pr = (
      await octokit.pulls.get({ owner, repo, pull_number: prNumber })
    ).data
    const branchName = pr.head.ref

    let sha: string | undefined
    try {
      const { data: file } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branchName,
      })
      if (!Array.isArray(file) && file.type === "file") {
        sha = file.sha
      }
    } catch {
      // Ignored
    }

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Resolve conflicts for ${filePath}`,
      content: Buffer.from(content).toString("base64"),
      branch: branchName,
      sha,
    })

    return { success: true }
  } catch (error) {
    throw new Error(
      `Conflict resolution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

export async function closePRAction(prNumber: number) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  const token = process.env.GITHUB_ARTICLES_WRITE_PAT
  const octokit = getOctokit(token)

  try {
    await octokit.pulls.update({
      owner,
      repo,
      pull_number: prNumber,
      state: "closed",
    })
    revalidatePath("/review")
    return { success: true }
  } catch (error) {
    throw new Error(
      `Close failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}
