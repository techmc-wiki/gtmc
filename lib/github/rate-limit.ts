import {
  getGithubErrorMessage,
  getGithubErrorResponseHeader,
  getGithubErrorStatus,
} from "@/lib/github/errors"

export function parseGithubErrorMessage(details: unknown): string | undefined {
  return getGithubErrorMessage(details)
}

export function isGithubRateLimitedResponse(
  response: Response,
  details: unknown
): boolean {
  if (response.status === 429) {
    return true
  }

  if (response.status !== 403) {
    return false
  }

  if (response.headers.get("x-ratelimit-remaining") === "0") {
    return true
  }

  const message = parseGithubErrorMessage(details)
  return typeof message === "string" && /rate limit/i.test(message)
}

export function getGithubRateLimitResetMs(error: unknown): number | null {
  const resetHeader = getGithubErrorResponseHeader(error, "x-ratelimit-reset")

  if (typeof resetHeader === "number") {
    return resetHeader * 1000
  }

  if (typeof resetHeader === "string") {
    const parsed = Number(resetHeader)
    if (Number.isFinite(parsed)) {
      return parsed * 1000
    }
  }

  return null
}

export function isGithubRateLimitErrorForCache(error: unknown): boolean {
  return getGithubErrorStatus(error) === 403
}
