import { GithubComment, GithubFeaturesError, GithubIssue } from "./api-client"

interface GithubLabel {
  name?: string
}

interface GithubAssignee {
  login?: string
}

export interface GithubIssueResponse {
  number?: number
  title?: string
  body?: string | null
  state?: "open" | "closed"
  labels?: Array<GithubLabel | string>
  assignees?: GithubAssignee[]
  created_at?: string
  updated_at?: string
  html_url?: string
  pull_request?: unknown
}

export interface GithubCommentResponse {
  id?: number
  body?: string | null
  created_at?: string
  updated_at?: string
}

export function normalizeIssue(raw: GithubIssueResponse): GithubIssue {
  if (
    typeof raw.number !== "number" ||
    typeof raw.title !== "string" ||
    typeof raw.state !== "string" ||
    typeof raw.created_at !== "string" ||
    typeof raw.updated_at !== "string" ||
    typeof raw.html_url !== "string"
  ) {
    throw new GithubFeaturesError({
      code: "INVALID_RESPONSE",
      message: "GitHub API returned an invalid issue response shape.",
      details: raw,
    })
  }

  return {
    number: raw.number,
    title: raw.title,
    body: raw.body ?? "",
    state: raw.state === "closed" ? "closed" : "open",
    labels: (raw.labels ?? [])
      .map((label) => {
        if (typeof label === "string") {
          return label
        }
        return label.name ?? ""
      })
      .filter(Boolean),
    assignees: (raw.assignees ?? [])
      .map((assignee) => assignee.login ?? "")
      .filter(Boolean),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    htmlUrl: raw.html_url,
  }
}

export function normalizeComment(raw: GithubCommentResponse): GithubComment {
  if (
    typeof raw.id !== "number" ||
    typeof raw.created_at !== "string" ||
    typeof raw.updated_at !== "string"
  ) {
    throw new GithubFeaturesError({
      code: "INVALID_RESPONSE",
      message: "GitHub API returned an invalid comment response shape.",
      details: raw,
    })
  }

  return {
    id: raw.id,
    body: raw.body ?? "",
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}
