import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import { determineMergeMethod, getPR } from "@/lib/github/pr-manager"

export async function resolveConflictAndMerge(
  prNumber: number,
  filePath: string,
  resolvedContent: string,
  token?: string,
  mergeMethod?: "squash" | "rebase"
) {
  const octokit = getOctokit(token)
  const pr = await getPR(prNumber, token)
  const actualMergeMethod =
    mergeMethod || (await determineMergeMethod(prNumber, token))
  const branchName = pr.head.ref
  const prHeadSha = pr.head.sha

  const { data: mainRef } = await octokit.git.getRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: "heads/main",
  })
  const mainSha = mainRef.object.sha

  const { data: commitInfo } = await octokit.repos.getCommit({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: prHeadSha,
  })
  const originalAuthor = commitInfo.commit.author
  const originalMessage = commitInfo.commit.message

  const { data: files } = await octokit.pulls.listFiles({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
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
        content: resolvedContent,
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
      content: resolvedContent,
    })
  }

  const { data: tree } = await octokit.git.createTree({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    base_tree: mainSha,
    tree: treeEntries,
  })

  const { data: newCommit } = await octokit.git.createCommit({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    message: `Resolve merge conflicts for ${filePath}\n\nOriginal message:\n${originalMessage}`,
    tree: tree.sha,
    parents: [mainSha],
    author: {
      name: originalAuthor?.name || "GTMC Bot",
      email: originalAuthor?.email || "bot@gtmc.dev",
      date: originalAuthor?.date,
    },
  })

  await octokit.git.updateRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: `heads/${branchName}`,
    sha: newCommit.sha,
    force: true,
  })

  const { data } = await octokit.pulls.merge({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    pull_number: prNumber,
    merge_method: actualMergeMethod,
  })

  return data
}
