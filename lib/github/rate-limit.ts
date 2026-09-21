import { RequestError } from "@octokit/request-error"
import { getGithubErrorStatus } from "@/lib/github/errors"

export function getGithubRateLimitResetMs(error: unknown): number | null {
  if (!(error instanceof RequestError)) return null
  const reset = Number(error.response?.headers["x-ratelimit-reset"])
  return Number.isFinite(reset) ? reset * 1000 : null
}

export function isGithubRateLimitErrorForCache(error: unknown): boolean {
  return getGithubErrorStatus(error) === 403
}
