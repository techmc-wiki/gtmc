import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getGitHubWriteToken,
  getOctokit,
} from "@/lib/github/articles-repo"
import { getGithubErrorStatusNumber } from "@/lib/github/errors"
import type { FileCategory } from "@/lib/file-upload"

type ArticleAssetUploadErrorCode =
  | "CONFIG_MISSING"
  | "AUTH_FAILED"
  | "API_ERROR"

export class ArticleAssetUploadError extends Error {
  code: ArticleAssetUploadErrorCode
  status?: number

  constructor(
    code: ArticleAssetUploadErrorCode,
    message: string,
    status?: number
  ) {
    super(message)
    this.name = "ArticleAssetUploadError"
    this.code = code
    this.status = status
  }
}

export async function uploadArticleAssetToGithub({
  buffer,
  category,
  filename,
  token,
}: {
  buffer: Buffer
  category: FileCategory
  filename: string
  token?: string | null
}) {
  const writeToken = getGitHubWriteToken(token)

  if (!writeToken) {
    throw new ArticleAssetUploadError(
      "CONFIG_MISSING",
      "Missing articles repo write token."
    )
  }

  const octokit = getOctokit(writeToken, true)
  const filePath = `data/${category}/${filename}`

  try {
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      path: filePath,
      message: `docs(assets): upload ${category.replace(/s$/, "")} ${filename}`,
      content: buffer.toString("base64"),
    })

    if (!Array.isArray(data.content) && data.content?.download_url) {
      return data.content.download_url
    }

    return buildArticleAssetUrl(filePath)
  } catch (error) {
    const status = getGithubErrorStatusNumber(error)

    if (status === 401 || status === 403) {
      throw new ArticleAssetUploadError(
        "AUTH_FAILED",
        "Failed to authorize asset upload.",
        status
      )
    }

    throw new ArticleAssetUploadError(
      "API_ERROR",
      "Failed to upload asset to the articles repository.",
      status
    )
  }
}

export function buildArticleAssetPath(
  category: FileCategory,
  filename: string
) {
  return `data/${category}/${filename}`
}

export function buildArticleAssetUrl(filePath: string) {
  return `https://raw.githubusercontent.com/${ARTICLES_REPO_OWNER}/${ARTICLES_REPO_NAME}/main/${filePath}`
}
