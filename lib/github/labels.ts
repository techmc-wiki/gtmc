import {
  GITHUB_API_BASE,
  getGithubRepoConfig,
  getGithubWriteToken,
  getRepoIssuesBaseUrl,
  GithubFeaturesError,
  requestGithub,
} from "./api-client"

export async function ensureLabel(
  name: string,
  color = "ededed"
): Promise<void> {
  const config = getGithubRepoConfig()
  const url = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/labels`

  try {
    await requestGithub(url, {
      method: "POST",
      body: JSON.stringify({ name, color }),
    })
  } catch (error) {
    if (
      error instanceof GithubFeaturesError &&
      error.code === "API_ERROR" &&
      (error.status === 409 || error.status === 422)
    ) {
      return
    }
    throw error
  }
}

export async function setIssueLabels(
  issueNumber: number,
  labels: string[]
): Promise<void> {
  const config = getGithubRepoConfig()
  const url = `${getRepoIssuesBaseUrl(config)}/${issueNumber}/labels`

  await requestGithub(url, {
    method: "PUT",
    body: JSON.stringify({ labels }),
  })
}

export async function setIssueState(
  issueNumber: number,
  state: "open" | "closed"
): Promise<void> {
  const config = getGithubRepoConfig()
  const url = `${getRepoIssuesBaseUrl(config)}/${issueNumber}`

  await requestGithub(url, {
    method: "PATCH",
    body: JSON.stringify({ state }),
  })
}

export async function setIssueAssignees(
  issueNumber: number,
  assignees: string[]
): Promise<void> {
  const config = getGithubRepoConfig()
  const url = `${getRepoIssuesBaseUrl(config)}/${issueNumber}`

  await requestGithub(url, {
    method: "PATCH",
    body: JSON.stringify({ assignees }),
  })
}

interface GithubContentsUploadResponse {
  content?: {
    download_url?: string | null
    [key: string]: unknown
  }
}

export async function uploadFileToGithub(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  category: "images" | "videos" | "files"
): Promise<string> {
  const config = getGithubRepoConfig()
  const path = `data/${category}/${filename}`
  const url = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/contents/${path}`
  const writeToken = getGithubWriteToken()

  const { data } = await requestGithub<GithubContentsUploadResponse>(
    url,
    {
      method: "PUT",
      body: JSON.stringify({
        message: `Upload ${category.replace(/s$/, "")}: ${filename}`,
        content: buffer.toString("base64"),
      }),
    },
    undefined,
    writeToken
  )

  if (
    !data?.content?.download_url ||
    typeof data.content.download_url !== "string"
  ) {
    throw new GithubFeaturesError({
      code: "INVALID_RESPONSE",
      message: "GitHub API returned an invalid contents upload response.",
      details: data,
    })
  }

  return data.content.download_url
}
