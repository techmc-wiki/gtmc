import { unstable_cache } from "next/cache"

import {
  getGithubRepoConfig,
  getRepoIssuesBaseUrl,
  GithubComment,
  GithubFeaturesError,
  parseNextLink,
  requestGithub,
} from "./api-client"
import { GithubCommentResponse, normalizeComment } from "./normalize"

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

async function _listIssueCommentsUncached(
  issueNumber: number
): Promise<GithubComment[]> {
  const config = getGithubRepoConfig()
  const baseUrl = `${getRepoIssuesBaseUrl(config)}/${issueNumber}/comments`

  const allComments: GithubComment[] = []
  let nextUrl: string | null = `${baseUrl}?per_page=100&page=1`

  while (nextUrl) {
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

export const listIssueComments = unstable_cache(
  _listIssueCommentsUncached,
  ["github-comments"],
  {
    revalidate: COMMENTS_TTL,
  }
)
