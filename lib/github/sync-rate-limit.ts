import {
  getGithubRateLimitResetMs,
  isGithubRateLimitErrorForCache,
} from "@/lib/github/rate-limit"

let rateLimitedUntilMs = 0

export function isGithubSyncRateLimited(): boolean {
  return Date.now() < rateLimitedUntilMs
}

export function recordGithubSyncRateLimit(error: unknown): void {
  if (!isGithubRateLimitErrorForCache(error)) return

  const resetMs = getGithubRateLimitResetMs(error)
  rateLimitedUntilMs = resetMs ?? Date.now() + 60_000
}
