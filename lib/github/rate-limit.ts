import {
  getGithubErrorResponseHeader,
  getGithubErrorStatus,
} from "@/lib/github/errors"

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
