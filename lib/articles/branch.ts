import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import { GIT_BLOB_MODE } from "@/lib/github/constants"
import { reviewError, summarizeSha } from "@/lib/review/logging"

const MAIN_BRANCH = "main"

interface FileSnapshot {
  content: string
  sha?: string
}

export type BranchFileEntry = {
  path: string
  content: string | Buffer
  encoding?: "utf-8" | "base64"
}

export async function getMainBranchHeadSha(token?: string) {
  const octokit = getOctokit(token)
  const { data } = await octokit.git.getRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: `heads/${MAIN_BRANCH}`,
  })

  return data.object.sha
}

export async function getArticleFileContent(
  filePath: string,
  ref: string,
  token?: string
) {
  return (await getFileSnapshot(filePath, ref, token))?.content ?? ""
}

export async function resolveArticleFilePath(
  filePath: string,
  refs: string[],
  token?: string
) {
  const normalizedPath = filePath.replace(/^\/+/, "")
  const withoutExtension = normalizedPath.replace(/\.md$/i, "")
  const candidates = normalizedPath.endsWith(".md")
    ? [normalizedPath, withoutExtension, `${withoutExtension}/README.md`]
    : [
        normalizedPath,
        `${withoutExtension}.md`,
        `${withoutExtension}/README.md`,
      ]

  for (const ref of refs) {
    for (const candidate of candidates) {
      const snapshot = await getFileSnapshot(candidate, ref, token)
      if (snapshot) {
        return candidate
      }
    }
  }

  return normalizedPath.endsWith(".md")
    ? normalizedPath
    : `${withoutExtension}.md`
}

async function getFileSnapshot(filePath: string, ref: string, token?: string) {
  const octokit = getOctokit(token)

  try {
    const { data } = await octokit.repos.getContent({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      path: filePath,
      ref,
    })

    if (Array.isArray(data) || data.type !== "file") {
      return null
    }

    return {
      content: Buffer.from(data.content, "base64").toString("utf-8"),
      sha: data.sha,
    } satisfies FileSnapshot
  } catch (error) {
    reviewError("getFileSnapshot", error, {
      filePath,
      ref: summarizeSha(ref),
      status: "github-api-error",
      operation: "repos.getContent",
    })
    return null
  }
}

export async function upsertFileOnBranch({
  authorEmail,
  authorName,
  branchName,
  content,
  filePath,
  message,
  token,
}: {
  authorEmail: string
  authorName: string
  branchName: string
  content: string
  filePath: string
  message: string
  token?: string
}) {
  const octokit = getOctokit(token)
  const snapshot = await getFileSnapshot(filePath, branchName, token)

  await octokit.repos.createOrUpdateFileContents({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    path: filePath,
    message,
    content: Buffer.from(content).toString("base64"),
    branch: branchName,
    sha: snapshot?.sha,
    author: { name: authorName, email: authorEmail },
  })
}

export async function upsertFilesOnBranch(
  token: string,
  entries: BranchFileEntry[],
  branchName: string
): Promise<void> {
  if (entries.length === 0) {
    return
  }

  const octokit = getOctokit(token)
  const { data: refData } = await octokit.git.getRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: `heads/${branchName}`,
  })
  const latestCommitSha = refData.object.sha

  const { data: commitData } = await octokit.git.getCommit({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    commit_sha: latestCommitSha,
  })
  const currentTreeSha = commitData.tree.sha

  const blobEntries = await Promise.all(
    entries.map(async (entry) => {
      const usesBase64 =
        Buffer.isBuffer(entry.content) || entry.encoding === "base64"
      const blobEncoding: "utf-8" | "base64" = usesBase64 ? "base64" : "utf-8"
      const blobContent = Buffer.isBuffer(entry.content)
        ? entry.content.toString("base64")
        : entry.content

      const { data: blobData } = await octokit.git.createBlob({
        owner: ARTICLES_REPO_OWNER,
        repo: ARTICLES_REPO_NAME,
        content: blobContent,
        encoding: blobEncoding,
      })

      return {
        path: entry.path,
        mode: GIT_BLOB_MODE,
        type: "blob" as const,
        sha: blobData.sha,
      }
    })
  )

  const { data: treeData } = await octokit.git.createTree({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    base_tree: currentTreeSha,
    tree: blobEntries,
  })

  const { data: createdCommit } = await octokit.git.createCommit({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    message: `docs: update ${entries.length} draft file${entries.length === 1 ? "" : "s"}`,
    tree: treeData.sha,
    parents: [latestCommitSha],
  })

  await octokit.git.updateRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: `heads/${branchName}`,
    sha: createdCommit.sha,
  })
}
