import type { Session } from "next-auth"

export const REAUTH_WINDOW_MS = 10 * 60 * 1000

export class ReauthRequiredError extends Error {
  constructor(message = "Re-authentication required. Please sign in again.") {
    super(message)
    this.name = "ReauthRequiredError"
  }
}

export function requireRecentAuth(
  session: Session & { user: { id: string } }
): void {
  const lastAuthAt = (session as Session & { lastAuthAt?: number }).lastAuthAt

  if (!lastAuthAt) {
    throw new ReauthRequiredError()
  }

  if (Date.now() - lastAuthAt > REAUTH_WINDOW_MS) {
    throw new ReauthRequiredError()
  }
}
