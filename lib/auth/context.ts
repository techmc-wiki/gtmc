import type { Session } from "next-auth"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getGitHubWriteToken } from "@/lib/github/articles-repo"

type AuthenticatedSession = Session & {
  user: NonNullable<Session["user"]> & { id: string }
}

export type AuthContext = {
  id: string
  role: string
  githubPat: string | null
}

export async function getCurrentUserAuthContext(
  userId: string
): Promise<AuthContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, githubPat: true },
  })
  if (!user) {
    throw new Error("User not found or has been deleted")
  }
  return {
    id: user.id,
    role: user.role ?? "USER",
    githubPat: user.githubPat ?? null,
  }
}

export async function requireAdmin(userId: string): Promise<AuthContext> {
  const ctx = await getCurrentUserAuthContext(userId)
  if (ctx.role !== "ADMIN") {
    throw new Error("Forbidden: admin access required")
  }
  return ctx
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

export async function getGithubPatForUser(
  userId: string
): Promise<string | undefined> {
  const ctx = await getCurrentUserAuthContext(userId)
  return getGitHubWriteToken(ctx.githubPat ?? undefined)
}
