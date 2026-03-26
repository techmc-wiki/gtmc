import { unstable_cache } from "next/cache"

import {
  getGithubRepoConfig,
  getRepoIssuesBaseUrl,
  GithubFeaturesError,
  GithubIssue,
  parseNextLink,
  requestGithub,
} from "./api-client"
import { GithubIssueResponse, normalizeIssue } from "./normalize"

async function _listAllIssuesUncached(
  state: "open" | "closed" | "all" = "open"
): Promise<GithubIssue[]> {
  const config = getGithubRepoConfig()
  const baseUrl = getRepoIssuesBaseUrl(config)

  const allIssues: GithubIssue[] = []
  let nextUrl: string | null = `${baseUrl}?state=${state}&per_page=100&page=1`

  while (nextUrl) {
    const { data, response } = await requestGithub<GithubIssueResponse[]>(
      nextUrl,
      {
        method: "GET",
      }
    )

    const pageItems = Array.isArray(data) ? data : []
    const filteredItems = pageItems.filter((item) => !item.pull_request)
    allIssues.push(...filteredItems.map(normalizeIssue))

    nextUrl = parseNextLink(response.headers.get("link"))
  }

  return allIssues
}

export const listAllIssues = unstable_cache(
  _listAllIssuesUncached,
  ["github-issues"],
  {
    revalidate: 300,
  }
)

export const listIssues = listAllIssues

const ISSUE_TTL = 60

async function _getIssueUncached(
  issueNumber: number
): Promise<GithubIssue | null> {
  const config = getGithubRepoConfig()
  const url = `${getRepoIssuesBaseUrl(config)}/${issueNumber}`

  const { data } = await requestGithub<GithubIssueResponse>(
    url,
    { method: "GET" },
    { allow404: true }
  )

  if (!data) {
    return null
  }

  if (data.pull_request) {
    return null
  }

  return normalizeIssue(data)
}

export const getIssue = unstable_cache(_getIssueUncached, ["github-issue"], {
  revalidate: ISSUE_TTL,
})

export async function createIssue(
  title: string,
  body: string,
  labels: string[] = []
): Promise<GithubIssue> {
  const config = getGithubRepoConfig()
  const url = getRepoIssuesBaseUrl(config)
  const payload: { title: string; body: string; labels?: string[] } = {
    title,
    body,
  }

  if (labels.length > 0) {
    payload.labels = labels
  }

  const { data } = await requestGithub<GithubIssueResponse>(url, {
    method: "POST",
    body: JSON.stringify(payload),
  })

  if (!data) {
    throw new GithubFeaturesError({
      code: "INVALID_RESPONSE",
      message: "GitHub API returned empty response for createIssue.",
    })
  }

  return normalizeIssue(data)
}

export async function updateIssue(
  issueNumber: number,
  data: {
    title?: string
    body?: string
    state?: "open" | "closed"
    labels?: string[]
  }
): Promise<GithubIssue> {
  const config = getGithubRepoConfig()
  const url = `${getRepoIssuesBaseUrl(config)}/${issueNumber}`

  const { data: issue } = await requestGithub<GithubIssueResponse>(url, {
    method: "PATCH",
    body: JSON.stringify(data),
  })

  if (!issue) {
    throw new GithubFeaturesError({
      code: "INVALID_RESPONSE",
      message: "GitHub API returned empty response for updateIssue.",
    })
  }

  return normalizeIssue(issue)
}
