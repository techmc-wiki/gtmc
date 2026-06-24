const REAUTH_ERROR_NAME = "ReauthRequiredError"
const REAUTH_ERROR_MESSAGE = "Re-authentication required. Please sign in again."

class ReauthRequiredError extends Error {
  constructor(message = REAUTH_ERROR_MESSAGE) {
    super(message)
    this.name = REAUTH_ERROR_NAME
  }
}

export function isReauthRequiredError(error: unknown): boolean {
  if (error instanceof ReauthRequiredError) {
    return true
  }

  if (!error || typeof error !== "object") {
    return false
  }

  const maybeError = error as { name?: unknown; message?: unknown }

  return (
    maybeError.name === REAUTH_ERROR_NAME ||
    maybeError.message === REAUTH_ERROR_MESSAGE
  )
}

export function getReauthLoginUrl(callbackUrl: string): string {
  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
}
