import { cacheLife, cacheTag } from "next/cache"

import type { GithubComment } from "./api-client"
import {
  getGithubRepoConfig,
  getRepoIssuesBaseUrl,
  GithubFeaturesError,
  parseNextLink,
  requestGithub,
} from "./api-client"
import type { GithubCommentResponse } from "./normalize"
import { normalizeComment } from "./normalize"
import { githubIssueCommentsTag } from "./cache-tags"

export async function addIssueComment(
  issueNumber: number,
  body: string
): Promise<GithubComment> {
  const config = getGithubRepoConfig()
  const url = `${getRepoIssuesBaseUrl(config)}/${issueNumber}/comments`

  const { data } = await requestGithub<GithubCommentResponse>(url, {
    method: "POST",
    body: JSON.stringify({ body }),
  })

  if (!data) {
    throw new GithubFeaturesError({
      code: "INVALID_RESPONSE",
      message: "GitHub API returned empty response for addIssueComment.",
    })
  }

  return normalizeComment(data)
}

// eslint-disable-next-line no-underscore-dangle
async function _listIssueCommentsUncached(
  issueNumber: number
): Promise<GithubComment[]> {
  const config = getGithubRepoConfig()
  const baseUrl = `${getRepoIssuesBaseUrl(config)}/${issueNumber}/comments`

  const allComments: GithubComment[] = []
  let nextUrl: string | null = `${baseUrl}?per_page=100&page=1`

  while (nextUrl) {
    // eslint-disable-next-line no-await-in-loop -- sequential pagination: nextUrl depends on previous response
    const { data, response } = await requestGithub<GithubCommentResponse[]>(
      nextUrl,
      {
        method: "GET",
      }
    )

    const pageItems = Array.isArray(data) ? data : []
    allComments.push(...pageItems.map(normalizeComment))

    nextUrl = parseNextLink(response.headers.get("link"))
  }

  return allComments
}

const COMMENTS_TTL = 25

export async function listIssueComments(
  issueNumber: number
): Promise<GithubComment[]> {
  "use cache"
  cacheLife({
    stale: COMMENTS_TTL,
    revalidate: COMMENTS_TTL,
    expire: COMMENTS_TTL * 12,
  })
  cacheTag(githubIssueCommentsTag(issueNumber))

  return _listIssueCommentsUncached(issueNumber)
}
