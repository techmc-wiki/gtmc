export function parseGithubErrorMessage(details: unknown): string | undefined {
  if (!details || typeof details !== "object") {
    return undefined
  }

  const candidate = details as { message?: unknown; error?: unknown }
  if (typeof candidate.message === "string") {
    return candidate.message
  }

  if (typeof candidate.error === "string") {
    return candidate.error
  }

  return undefined
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
  const resetHeader = (
    error as { response?: { headers?: { [key: string]: string | number } } }
  )?.response?.headers?.["x-ratelimit-reset"]

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
  const status =
    (error as { status?: number })?.status ||
    (error as { response?: { status?: number } })?.response?.status

  return status === 403
}
