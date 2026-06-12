import {
  getGithubPatForUser,
  requireAdmin,
  requireAuth,
} from "@/lib/auth/context"

export async function requireReviewAdminContext() {
  const session = await requireAuth()
  await requireAdmin(session.user.id)

  return {
    session,
    token: await getGithubPatForUser(session.user.id),
    authorName: session.user.name || "GTMC Admin",
    authorEmail: session.user.email || "admin@gtmc.dev",
  }
}

export function getReviewRevalidatePaths(
  revisionId: string,
  prNumber?: number | null
) {
  return [
    "/draft",
    `/draft/${revisionId}`,
    "/review",
    prNumber ? `/review/${prNumber}` : "",
  ].filter(Boolean)
}
