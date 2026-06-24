import { cacheLife, cacheTag } from "next/cache"

import type { GithubIssue } from "./api-client"
import {
  getGithubRepoConfig,
  getRepoIssuesBaseUrl,
  GithubFeaturesError,
  parseNextLink,
  requestGithub,
} from "./api-client"
import type { GithubIssueResponse } from "./normalize"
import { normalizeIssue } from "./normalize"
import { GITHUB_ISSUES_TAG, githubIssueTag } from "./cache-tags"

const ISSUE_LIST_TTL = 300
const ISSUE_TTL = 60

// eslint-disable-next-line no-underscore-dangle
async function _listAllIssuesUncached(
  state: "open" | "closed" | "all" = "open"
): Promise<GithubIssue[]> {
  const config = getGithubRepoConfig()
  const baseUrl = getRepoIssuesBaseUrl(config)

  const allIssues: GithubIssue[] = []
  let nextUrl: string | null = `${baseUrl}?state=${state}&per_page=100&page=1`

  while (nextUrl) {
    // eslint-disable-next-line no-await-in-loop -- sequential pagination: nextUrl depends on previous response
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

export async function listAllIssues(
  state: "open" | "closed" | "all" = "open"
): Promise<GithubIssue[]> {
  "use cache"
  cacheLife({
    stale: ISSUE_LIST_TTL,
    revalidate: ISSUE_LIST_TTL,
    expire: ISSUE_LIST_TTL * 12,
  })
  cacheTag(GITHUB_ISSUES_TAG)

  return _listAllIssuesUncached(state)
}

// eslint-disable-next-line no-underscore-dangle
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

export async function getIssue(
  issueNumber: number
): Promise<GithubIssue | null> {
  "use cache"
  cacheLife({
    stale: ISSUE_TTL,
    revalidate: ISSUE_TTL,
    expire: ISSUE_TTL * 10,
  })
  cacheTag(GITHUB_ISSUES_TAG, githubIssueTag(issueNumber))

  return _getIssueUncached(issueNumber)
}

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
