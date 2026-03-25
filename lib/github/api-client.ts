const GITHUB_API_BASE = "https://api.github.com"
const GITHUB_ACCEPT_HEADER = "application/vnd.github.v3+json"

export interface GithubIssue {
  number: number
  title: string
  body: string
  state: "open" | "closed"
  labels: string[]
  assignees: string[]
  createdAt: string
  updatedAt: string
  htmlUrl: string
}

export interface GithubComment {
  id: number
  body: string
  createdAt: string
  updatedAt: string
}

export type GithubFeaturesErrorCode =
  | "CONFIG_MISSING"
  | "AUTH_FAILED"
  | "RATE_LIMITED"
  | "API_ERROR"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE"

export interface GithubFeaturesErrorObject {
  code: GithubFeaturesErrorCode
  message: string
  status?: number
  details?: unknown
}

export class GithubFeaturesError
  extends Error
  implements GithubFeaturesErrorObject
{
  code: GithubFeaturesErrorCode
  status?: number
  details?: unknown

  constructor(params: GithubFeaturesErrorObject) {
    super(params.message)
    this.name = "GithubFeaturesError"
    this.code = params.code
    this.status = params.status
    this.details = params.details
  }
}

export interface GithubRepoConfig {
  owner: string
  repo: string
  token: string
}

interface GithubEmailRecord {
  email: string
  primary: boolean
  verified: boolean
  visibility: "public" | "private"
}

export function getGithubRepoConfig(): GithubRepoConfig {
  const owner = process.env.GITHUB_REPO_OWNER
  const repo = process.env.GITHUB_REPO_NAME
  const token = process.env.GITHUB_FEATURES_ISSUES_PAT

  if (!owner || !repo || !token) {
    throw new GithubFeaturesError({
      code: "CONFIG_MISSING",
      message:
        "Missing GitHub configuration. Required env vars: GITHUB_REPO_OWNER, GITHUB_REPO_NAME, GITHUB_FEATURES_ISSUES_PAT.",
    })
  }

  return { owner, repo, token }
}

export function getGithubWriteToken(): string {
  const token = process.env.GITHUB_FEATURES_WRITE_PAT
  if (!token) {
    throw new GithubFeaturesError({
      code: "CONFIG_MISSING",
      message:
        "Missing GitHub write configuration. Required env var: GITHUB_FEATURES_WRITE_PAT.",
    })
  }
  return token
}

export function getRepoIssuesBaseUrl(config: GithubRepoConfig): string {
  return `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/issues`
}

export function parseJsonSafely(text: string): unknown {
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function parseErrorMessage(details: unknown): string | undefined {
  if (!details || typeof details !== "object") {
    return undefined
  }

  const candidate = details as { message?: unknown; error?: unknown }
  if (typeof candidate.message === "string") {
    return candidate.message
  }

  if (typeof candidate.error === "string") {
    return candidate.error
  }

  return undefined
}

export function isRateLimited(response: Response, details: unknown): boolean {
  if (response.status === 429) {
    return true
  }

  if (response.status !== 403) {
    return false
  }

  if (response.headers.get("x-ratelimit-remaining") === "0") {
    return true
  }

  const message = parseErrorMessage(details)
  return typeof message === "string" && /rate limit/i.test(message)
}

export function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) {
    return null
  }

  const parts = linkHeader.split(",")
  for (const part of parts) {
    const trimmed = part.trim()
    const match = trimmed.match(/<([^>]+)>;\s*rel="([^"]+)"/)
    if (match && match[2] === "next") {
      return match[1]
    }
  }

  return null
}

export async function requestGithub<T>(
  url: string,
  init: RequestInit,
  options?: { allow404?: boolean },
  tokenOverride?: string
): Promise<{ data: T | null; response: Response }> {
  const config = getGithubRepoConfig()

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: GITHUB_ACCEPT_HEADER,
        Authorization: `token ${tokenOverride ?? config.token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    })
  } catch (error) {
    throw new GithubFeaturesError({
      code: "NETWORK_ERROR",
      message: "GitHub API request failed due to a network error.",
      details: error,
    })
  }

  const text = await response.text()
  const parsed = parseJsonSafely(text)

  if (options?.allow404 && response.status === 404) {
    return { data: null, response }
  }

  if (response.status === 401 || response.status === 403) {
    if (isRateLimited(response, parsed)) {
      throw new GithubFeaturesError({
        code: "RATE_LIMITED",
        message: "GitHub rate limit exceeded",
        status: response.status,
        details: parsed,
      })
    }

    throw new GithubFeaturesError({
      code: "AUTH_FAILED",
      message: "GitHub API authorization failed",
      status: response.status,
      details: parsed,
    })
  }

  if (isRateLimited(response, parsed)) {
    throw new GithubFeaturesError({
      code: "RATE_LIMITED",
      message: "GitHub rate limit exceeded",
      status: response.status,
      details: parsed,
    })
  }

  if (!response.ok) {
    const apiMessage = parseErrorMessage(parsed)
    throw new GithubFeaturesError({
      code: "API_ERROR",
      message: `GitHub API request failed with status ${response.status}${apiMessage ? `: ${apiMessage}` : ""}`,
      status: response.status,
      details: parsed,
    })
  }

  return { data: parsed as T, response }
}

export async function getGithubEmailVisibility(
  token: string
): Promise<"private" | "public"> {
  if (!token) {
    return "private"
  }

  try {
    const { data } = await requestGithub<GithubEmailRecord[]>(
      `${GITHUB_API_BASE}/user/emails`,
      { method: "GET" },
      undefined,
      token
    )

    if (!data || !Array.isArray(data)) {
      return "private"
    }

    const primaryEmail = data.find((email) => email.primary)
    if (!primaryEmail) {
      return "private"
    }

    return primaryEmail.visibility === "public" ? "public" : "private"
  } catch {
    return "private"
  }
}

export { GITHUB_API_BASE }
