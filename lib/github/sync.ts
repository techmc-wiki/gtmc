import { getGithubErrorStatus } from "@/lib/github/errors"
import { executeWithRetry } from "@/lib/github/retry-fetch"
import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import {
  isGithubSyncRateLimited,
  recordGithubSyncRateLimit,
} from "@/lib/github/sync-rate-limit"

export { getRepoContentTree } from "@/lib/github/repo-content-tree"
export type { ArticleTreeNode } from "@/lib/github/repo-content-tree"

export async function getRepoFileContent(
  filePath: string,
  retries = 3
): Promise<string | null> {
  if (isGithubSyncRateLimited()) {
    return null
  }

  const octokit = getOctokit(undefined, true)

  return executeWithRetry<string | null>({
    retries,
    operation: async () => {
      const { data } = await octokit.repos.getContent({
        owner: ARTICLES_REPO_OWNER,
        repo: ARTICLES_REPO_NAME,
        path: filePath,
      })

      if (!Array.isArray(data) && data.type === "file") {
        return Buffer.from(data.content, "base64").toString("utf-8")
      }

      return null
    },
    onError: (error, attempt, totalRetries) => {
      const status = getGithubErrorStatus(error)
      recordGithubSyncRateLimit(error)

      if (status === 404) {
        return { type: "return", value: null }
      }

      if (attempt === totalRetries - 1) {
        console.error(
          "[github-pr] Failed to fetch %s after %d attempts:",
          filePath,
          totalRetries,
          error
        )
        return { type: "return", value: null }
      }

      return { type: "retry" }
    },
  })
}

export async function getRepoFileBuffer(
  filePath: string,
  retries = 3
): Promise<Buffer | null> {
  if (isGithubSyncRateLimited()) {
    return null
  }

  const octokit = getOctokit(undefined, true)

  return executeWithRetry<Buffer | null>({
    retries,
    operation: async () => {
      const { data } = await octokit.repos.getContent({
        owner: ARTICLES_REPO_OWNER,
        repo: ARTICLES_REPO_NAME,
        path: filePath,
      })

      if (!Array.isArray(data) && data.type === "file") {
        return Buffer.from(data.content, "base64")
      }

      return null
    },
    onError: (error, attempt, totalRetries) => {
      const status = getGithubErrorStatus(error)
      recordGithubSyncRateLimit(error)

      if (status === 404) {
        return { type: "return", value: null }
      }

      if (attempt === totalRetries - 1) {
        console.error(
          "[github-pr] Failed to fetch buffer %s after %d attempts:",
          filePath,
          totalRetries,
          error
        )
        return { type: "return", value: null }
      }

      return { type: "retry" }
    },
  })
}
