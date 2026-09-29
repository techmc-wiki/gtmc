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

let rateLimitedUntilMs = 0

export function isGithubSyncRateLimited(): boolean {
  return Date.now() < rateLimitedUntilMs
}

export function recordGithubSyncRateLimit(error: unknown): void {
  if (!isGithubRateLimitErrorForCache(error)) return

  const resetMs = getGithubRateLimitResetMs(error)
  rateLimitedUntilMs = resetMs ?? Date.now() + 60_000
}
