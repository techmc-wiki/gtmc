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
      merge_method: "rebase",
    })
    revalidatePath("/review")
    return { success: true }
  } catch (error) {
    throw new Error(
      `Merge failed: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

export async function resolveConflictAction(
  prNumber: number,
  formData: FormData
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
    const pr = (await octokit.pulls.get({ owner, repo, pull_number: prNumber }))
      .data
    const branchName = pr.head.ref
    const prHeadSha = pr.head.sha

    const { data: mainRef } = await octokit.git.getRef({
      owner,
      repo,
      ref: "heads/main",
    })
    const mainSha = mainRef.object.sha

    const { data: commitInfo } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: prHeadSha,
    })
    const originalAuthor = commitInfo.commit.author
    const originalMessage = commitInfo.commit.message

    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    })

    type TreeEntry = {
      path?: string
      mode?: "100644" | "100755" | "040000" | "160000" | "120000"
      type?: "blob" | "tree" | "commit"
      sha?: string | null
      content?: string
    }
    const treeEntries: TreeEntry[] = []
    let resolvedFileAdded = false

    for (const f of files) {
      if (f.filename === filePath) {
        resolvedFileAdded = true
        treeEntries.push({
          path: f.filename,
          mode: "100644",
          type: "blob",
          content: content,
        })
      } else if (f.status === "removed") {
        treeEntries.push({
          path: f.filename,
          mode: "100644",
          type: "blob",
          sha: null,
        })
      } else {
        treeEntries.push({
          path: f.filename,
          mode: "100644",
          type: "blob",
          sha: f.sha,
        })
      }
    }

    if (!resolvedFileAdded) {
      treeEntries.push({
        path: filePath,
        mode: "100644",
        type: "blob",
        content: content,
      })
    }

    const { data: tree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: mainSha,
      tree: treeEntries as TreeEntry[],
    })

    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: `Resolve conflicts for ${filePath}\n\nOriginal message:\n${originalMessage}`,
      tree: tree.sha,
      parents: [mainSha],
      author: {
        name: originalAuthor?.name || "GTMC Bot",
        email: originalAuthor?.email || "bot@gtmc.dev",
        date: originalAuthor?.date,
      },
    })

    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
      sha: newCommit.sha,
      force: true,
    })

    return { success: true }
  } catch (error) {
    throw new Error(
      `Conflict resolution failed: ${error instanceof Error ? error.message : "Unknown error"}`
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
      `Close failed: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}
