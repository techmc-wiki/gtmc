import { auth } from "@/lib/auth"
import type { Session } from "next-auth"
import { requireAdmin } from "@/lib/auth-context"
import type { AuthContext } from "@/lib/auth-context"

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

/**
 * Requires the caller to be authenticated AND have admin role (verified from DB).
 * Returns both the session and the fresh auth context.
 */
export async function requireAuthWithRole(
  message = "Unauthorized"
): Promise<{ session: AuthenticatedSession; ctx: AuthContext }> {
  const session = await requireAuth(message)
  const ctx = await requireAdmin(session.user.id)
  return { session, ctx }
}
