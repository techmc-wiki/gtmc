import type { Session } from "next-auth"

import { auth } from "@/lib/auth"
import { readProfile } from "@/lib/auth/profile"

type AuthenticatedSession = Session & {
  user: NonNullable<Session["user"]> & { id: string }
}

export async function requireAuth(
  message = "Unauthorized"
): Promise<AuthenticatedSession> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error(message)
  }
  return session as AuthenticatedSession
}

export async function getAuthorIdentity(session: AuthenticatedSession) {
  const profile = await readProfile(session.user.id)
  return {
    name: profile?.name || session.user.name || "GTMC Contributor",
    email: session.user.githubLogin
      ? `${session.user.id}+${session.user.githubLogin}@users.noreply.github.com`
      : session.user.email || "author@gtmc.dev",
  }
}
