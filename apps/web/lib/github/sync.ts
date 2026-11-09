import { getGithubErrorStatus } from "@/lib/github/errors"
import { executeWithRetry } from "@/lib/github/retry-fetch"
import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import {
  isGithubRateLimitErrorForCache,
  isGithubSyncRateLimited,
  recordGithubSyncRateLimit,
} from "@/lib/github/rate-limit"

export { getRepoContentTree } from "@/lib/github/repo-content-tree"
export type { ArticleTreeNode } from "@/lib/github/repo-content-tree"

async function fetchRepoFile<TResult>(
  filePath: string,
  retries: number,
  decode: (base64Content: string) => TResult,
  failureLogFormat: string
): Promise<TResult | null> {
  if (isGithubSyncRateLimited()) {
    return null
  }

  const octokit = getOctokit(undefined, true)

  return executeWithRetry<TResult | null>({
    retries,
    operation: async () => {
      const { data } = await octokit.repos.getContent({
        owner: ARTICLES_REPO_OWNER,
        repo: ARTICLES_REPO_NAME,
        path: filePath,
      })

      if (!Array.isArray(data) && data.type === "file") {
        return decode(data.content)
      }

      return null
    },
    onError: (error, attempt, totalRetries) => {
      const status = getGithubErrorStatus(error)

      if (isGithubRateLimitErrorForCache(error)) {
        recordGithubSyncRateLimit(error)
        return { type: "return", value: null }
      }

      if (status === 404) {
        return { type: "return", value: null }
      }

      if (attempt === totalRetries - 1) {
        console.error(failureLogFormat, filePath, totalRetries, error)
        return { type: "return", value: null }
      }

      return { type: "retry" }
    },
  })
}

export async function getRepoFileContent(
  filePath: string,
  retries = 3
): Promise<string | null> {
  return fetchRepoFile(
    filePath,
    retries,
    (content) => Buffer.from(content, "base64").toString("utf-8"),
    "[github-pr] Failed to fetch %s after %d attempts:"
  )
}

export async function getRepoFileBuffer(
  filePath: string,
  retries = 3
): Promise<Buffer | null> {
  return fetchRepoFile(
    filePath,
    retries,
    (content) => Buffer.from(content, "base64"),
    "[github-pr] Failed to fetch buffer %s after %d attempts:"
  )
}
