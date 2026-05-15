import {
  GITHUB_API_BASE,
  GithubFeaturesError,
  requestGithub,
} from "./api-client"
import {
  EXPLANATION_MARKER,
  METADATA_MARKER,
  SYSTEM_COMMENT_MARKER,
} from "./constants"

// Re-export for barrel compatibility (@/lib/github)
export { EXPLANATION_MARKER, METADATA_MARKER, SYSTEM_COMMENT_MARKER }

export type AppFeatureStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED"

export const APP_STATUS_LABELS = {
  PENDING: "status:pending",
  IN_PROGRESS: "status:in-progress",
  RESOLVED: "status:resolved",
} as const

export const STATUS_LABEL_COLORS = {
  "status:pending": "fbca04",
  "status:in-progress": "0075ca",
  "status:resolved": "0e8a16",
} as const

const STATUS_LABEL_PREFIX = "status:"

export function serializeSystemComment(content: string): string {
  return `${SYSTEM_COMMENT_MARKER}\n\n${content}`
}

export async function getGithubLoginByAccountId(
  accountId: string
): Promise<string | null> {
  const normalizedAccountId = accountId.trim()
  if (!normalizedAccountId) {
    return null
  }

  const endpoint = Number.isNaN(Number(normalizedAccountId))
    ? `${GITHUB_API_BASE}/users/${encodeURIComponent(normalizedAccountId)}`
    : `${GITHUB_API_BASE}/user/${normalizedAccountId}`

  try {
    const { data } = await requestGithub<{
      login: string
      id: number
      [key: string]: unknown
    }>(endpoint, {
      method: "GET",
    })

    if (!data || !data.login) {
      return null
    }

    return data.login
  } catch {
    return null
  }
}

export async function getGithubLoginByToken(
  token: string
): Promise<string | null> {
  if (!token) {
    return null
  }

  try {
    const { data } = await requestGithub<{
      login?: string
      [key: string]: unknown
    }>(
      `${GITHUB_API_BASE}/user`,
      {
        method: "GET",
      },
      undefined,
      token
    )

    if (!data || typeof data.login !== "string" || data.login.length === 0) {
      return null
    }

    return data.login
  } catch {
    return null
  }
}

export function statusToLabels(status: string): string[] {
  if (status === "PENDING") {
    return [APP_STATUS_LABELS.PENDING]
  }

  if (status === "IN_PROGRESS") {
    return [APP_STATUS_LABELS.IN_PROGRESS]
  }

  if (status === "RESOLVED") {
    return [APP_STATUS_LABELS.RESOLVED]
  }

  throw new GithubFeaturesError({
    code: "API_ERROR",
    message: `Unknown feature status: ${status}`,
  })
}

export function labelsToStatus(labels: string[]): AppFeatureStatus {
  if (labels.includes(APP_STATUS_LABELS.RESOLVED)) {
    return "RESOLVED"
  }

  if (labels.includes(APP_STATUS_LABELS.IN_PROGRESS)) {
    return "IN_PROGRESS"
  }

  return "PENDING"
}

export function issueStateForStatus(status: string): "open" | "closed" {
  if (status === "RESOLVED") {
    return "closed"
  }

  return "open"
}

export function tagsToLabels(tags: string[]): string[] {
  return [...tags]
}

export function labelsToTags(labels: string[]): string[] {
  return labels.filter((label) => !label.startsWith(STATUS_LABEL_PREFIX))
}
