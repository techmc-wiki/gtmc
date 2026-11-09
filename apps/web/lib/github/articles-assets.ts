import { ARTICLES_SOURCE_BRANCH } from "@/lib/articles/source"
import { getGithubErrorStatus } from "@/lib/github/errors"
import { ARTICLES_REPO, getOctokit } from "@/lib/github/repos"
import { resolveGithubToken } from "@/lib/github/tokens"
import type { FileCategory } from "@/lib/uploads/file-upload"

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
  const writeToken = resolveGithubToken(token)

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
      owner: ARTICLES_REPO.owner,
      repo: ARTICLES_REPO.name,
      path: filePath,
      branch: ARTICLES_SOURCE_BRANCH,
      message: `docs(assets): upload ${category.replace(/s$/, "")} ${filename}`,
      content: buffer.toString("base64"),
    })

    return data.content?.download_url || buildArticleAssetUrl(filePath)
  } catch (error) {
    const status = getGithubErrorStatus(error)

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

function buildArticleAssetUrl(filePath: string) {
  return `https://raw.githubusercontent.com/${ARTICLES_REPO.owner}/${ARTICLES_REPO.name}/${ARTICLES_SOURCE_BRANCH}/${filePath}`
}
