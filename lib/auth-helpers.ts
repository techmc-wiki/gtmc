import { auth } from "@/lib/auth"
import type { Session } from "next-auth"

type AuthenticatedSession = Session & {
  user: NonNullable<Session["user"]> & { id: string }
}

/**
 * Requires the caller to be authenticated.
 * Throws an Error with the provided message if not.
 * Returns the session with guaranteed user object.
 */
export async function requireAuth(
  message = "Unauthorized"
): Promise<AuthenticatedSession> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error(message)
  }
  return session as AuthenticatedSession
}
