"use server"

import {
  getCurrentUserAuthContext,
  getGithubPatForUser,
  requireAdmin,
  requireAuth,
} from "@/lib/auth-context"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import {
  addIssueComment,
  updateIssue,
  setIssueLabels,
  setIssueState,
  parseIssueBody,
  serializeIssueBody,
  serializeCommentBody,
  serializeSystemComment,
  getGithubLoginByAccountId,
  getGithubLoginByToken,
  tagsToLabels,
  statusToLabels,
  labelsToTags,
  getIssue,
  getGithubEmailVisibility,
  createMetadataFromSession,
  parseIssueNumber,
  type IssueMetadata,
} from "@/lib/github"
import {
  updateGithubIssueCache,
  updateGithubIssueCommentsCache,
} from "@/lib/github/cache-tags"

async function getFeatureByIssueNumber(issueNumber: number) {
  const issue = await getIssue(issueNumber)
  if (!issue) return null
  const parsed = parseIssueBody(issue.body)
  return { issue, parsed }
}

async function resolveGithubLoginFromAccount(
  account: {
    providerAccountId: string
    access_token: string | null
  } | null
): Promise<string | null> {
  if (!account) {
    return null
  }

  const loginByAccountId = await getGithubLoginByAccountId(
    account.providerAccountId
  )
  if (loginByAccountId) {
    return loginByAccountId
  }

  if (!account.access_token) {
    return null
  }

  return getGithubLoginByToken(account.access_token)
}

async function resolveMentionToken(
  appUserId: string,
  displayName: string | null
): Promise<string> {
  try {
    const account = await prisma.account.findFirst({
      where: { provider: "github", userId: appUserId },
    })
    if (account) {
      const login = await resolveGithubLoginFromAccount(account)
      if (login) {
        return `@${login}`
      }
    }
  } catch {
    // fallthrough to plain text
  }
  return displayName ?? appUserId
}

function getMetadataForWrite(
  metadata: IssueMetadata | null,
  fallbackAppUserId: string
): IssueMetadata {
  if (metadata) {
    return metadata
  }

  return {
    appUserId: fallbackAppUserId,
    authorName: null,
    authorEmail: null,
  }
}

export async function updateFeatureExplanation(
  id: string,
  explanation: string
) {
  const session = await requireAuth()

  const issueNumber = parseIssueNumber(id)

  const feature = await getFeatureByIssueNumber(issueNumber)
  if (!feature) throw new Error("Not found")

  if (feature.issue.state === "closed") {
    throw new Error("Feature is deleted and read-only")
  }

  const { issue, parsed } = feature

  const authContext = await getCurrentUserAuthContext(session.user.id)
  const isAdmin = authContext.role === "ADMIN"
  const isAssignee = parsed.metadata?.assigneeId === session.user.id
  if (!isAssignee && !isAdmin) throw new Error("Forbidden")

  const newBody = serializeIssueBody(
    parsed.userContent,
    parsed.metadata ?? {
      appUserId: "",
      authorName: null,
      authorEmail: null,
    },
    explanation || undefined
  )

  await updateIssue(issue.number, { body: newBody })
  updateGithubIssueCache(issue.number)

  revalidatePath(`/features/${id}`)
  return { success: true }
}

export async function assignFeature(id: string) {
  const session = await requireAuth()

  const issueNumber = parseIssueNumber(id)

  const feature = await getFeatureByIssueNumber(issueNumber)
  if (!feature) throw new Error("Not found")

  if (feature.issue.state === "closed") {
    throw new Error("Feature is deleted and read-only")
  }

  const { issue, parsed } = feature
  const metadataForWrite = getMetadataForWrite(
    parsed.metadata,
    `legacy-issue-${issue.number}`
  )

  const newBodyWithAssignee = serializeIssueBody(
    parsed.userContent,
    {
      appUserId: metadataForWrite.appUserId,
      authorName: metadataForWrite.authorName,
      authorEmail: metadataForWrite.authorEmail,
      assigneeId: session.user.id,
      assigneeName: session.user.name ?? null,
      assigneeEmail: session.user.email ?? null,
    },
    parsed.explanation ?? undefined
  )

  const tags = labelsToTags(issue.labels)
  const newLabels = [...tagsToLabels(tags), ...statusToLabels("IN_PROGRESS")]

  await Promise.all([
    setIssueLabels(issue.number, newLabels),
    updateIssue(issue.number, { body: newBodyWithAssignee }),
  ])
  updateGithubIssueCache(issue.number)

  // Post claim bot comment (best-effort, does not fail the action)
  try {
    const mentionToken = await resolveMentionToken(
      session.user.id,
      session.user.name ?? null
    )

    // Query GitHub Account and check email visibility
    const token = await getGithubPatForUser(session.user.id)
    const visibility = await getGithubEmailVisibility(token || "")
    const assigneeEmail =
      visibility === "private"
        ? "REDACTED FOR PRIVACY"
        : (session.user.email ?? "Unknown")

    const payload = `[Assignment Notice]
Action: CLAIMED
Assignee: ${mentionToken}
AssigneeId: ${session.user.id}
AssigneeEmail: ${assigneeEmail}
By: ${mentionToken}
    At: ${new Date().toISOString()}`
    await addIssueComment(issue.number, serializeSystemComment(payload))
    updateGithubIssueCommentsCache(issue.number)
    updateGithubIssueCache(issue.number)
  } catch (error) {
    console.warn("Failed to post claim bot comment:", error)
  }

  revalidatePath("/features")
  revalidatePath(`/features/${id}`)
  return { success: true, feature: { id } }
}

export async function unassignFeature(id: string) {
  const session = await requireAuth()

  const issueNumber = parseIssueNumber(id)

  const feature = await getFeatureByIssueNumber(issueNumber)
  if (!feature) throw new Error("Not found")

  if (feature.issue.state === "closed") {
    throw new Error("Feature is deleted and read-only")
  }

  const { issue, parsed } = feature
  const authContext = await getCurrentUserAuthContext(session.user.id)
  const isAdmin = authContext.role === "ADMIN"
  const isAssignee = parsed.metadata?.assigneeId === session.user.id
  if (!isAssignee && !isAdmin) throw new Error("Forbidden")

  const metadataForWrite = getMetadataForWrite(
    parsed.metadata,
    `legacy-issue-${issue.number}`
  )

  const newBody = serializeIssueBody(
    parsed.userContent,
    {
      appUserId: metadataForWrite.appUserId,
      authorName: metadataForWrite.authorName,
      authorEmail: metadataForWrite.authorEmail,
    },
    parsed.explanation ?? undefined
  )

  const tags = labelsToTags(issue.labels)
  const newLabels = [...tagsToLabels(tags), ...statusToLabels("PENDING")]

  await Promise.all([
    setIssueLabels(issue.number, newLabels),
    updateIssue(issue.number, { body: newBody }),
  ])
  updateGithubIssueCache(issue.number)

  // Post drop bot comment (best-effort, does not fail the action)
  try {
    const mentionToken = await resolveMentionToken(
      session.user.id,
      session.user.name ?? null
    )
    const prevAssigneeId = parsed.metadata?.assigneeId ?? ""
    const previousMentionToken = prevAssigneeId
      ? await resolveMentionToken(
          prevAssigneeId,
          parsed.metadata?.assigneeName ?? null
        )
      : "N/A"
    const payload = `[Assignment Notice]
Action: DROPPED
PreviousAssignee: ${previousMentionToken}
PreviousAssigneeId: ${parsed.metadata?.assigneeId ?? "N/A"}
By: ${mentionToken}
    At: ${new Date().toISOString()}`
    await addIssueComment(issue.number, serializeSystemComment(payload))
    updateGithubIssueCommentsCache(issue.number)
    updateGithubIssueCache(issue.number)
  } catch (error) {
    console.warn("Failed to post drop bot comment:", error)
  }

  revalidatePath("/features")
  revalidatePath(`/features/${id}`)
  return { success: true, feature: { id } }
}

export async function resolveFeature(id: string, resolutionComment?: string) {
  const session = await requireAuth()

  const issueNumber = parseIssueNumber(id)

  await requireAdmin(session.user.id)

  const feature = await getFeatureByIssueNumber(issueNumber)
  if (!feature) throw new Error("Not found")

  if (feature.issue.state === "closed") {
    throw new Error("Feature is deleted and read-only")
  }

  const { issue } = feature

  const tags = labelsToTags(issue.labels)
  const newLabels = [...tagsToLabels(tags), ...statusToLabels("RESOLVED")]

  await setIssueLabels(issue.number, newLabels)
  await setIssueState(issue.number, "closed")
  updateGithubIssueCache(issue.number)

  if (resolutionComment) {
    await addIssueComment(
      issue.number,
      serializeCommentBody(
        `[Resolution]: ${resolutionComment}`,
        createMetadataFromSession(session)
      )
    )
    updateGithubIssueCommentsCache(issue.number)
    updateGithubIssueCache(issue.number)
  }

  revalidatePath("/features")
  revalidatePath(`/features/${id}`)
  return { success: true, feature: { id } }
}

export async function addFeatureComment(id: string, content: string) {
  const session = await requireAuth()

  const issueNumber = parseIssueNumber(id)

  const feature = await getFeatureByIssueNumber(issueNumber)
  if (!feature) throw new Error("Not found")

  if (feature.issue.state === "closed") {
    throw new Error("Feature is deleted and read-only")
  }

  // Query GitHub Account and check email visibility
  const account = await prisma.account.findFirst({
    where: {
      provider: "github",
      userId: session.user.id,
    },
  })

  const token = await getGithubPatForUser(session.user.id)
  const visibility = await getGithubEmailVisibility(token || "")
  const isPrivate = visibility === "private"

  const githubLogin = await resolveGithubLoginFromAccount(account)
  const fallbackAuthorLabel =
    session.user.name ?? session.user.email ?? session.user.id
  const mentionToken = githubLogin ? `@${githubLogin}` : fallbackAuthorLabel
  const authorLine = githubLogin
    ? `> **[BY]** ${mentionToken} (${fallbackAuthorLabel})`
    : `> **[BY]** ${mentionToken}`

  const authorEmail = isPrivate ? null : (session.user.email ?? null)
  const emailRedacted = isPrivate

  const commentBody = serializeCommentBody(
    `<!-- GTMC_COMMENT_AUTHOR_LINE -->\n${authorLine}\n\n${content}`,
    {
      ...createMetadataFromSession(session),
      authorEmail,
      emailRedacted,
    }
  )

  const ghComment = await addIssueComment(feature.issue.number, commentBody)
  updateGithubIssueCommentsCache(feature.issue.number)
  updateGithubIssueCache(feature.issue.number)

  revalidatePath(`/features/${id}`)

  return {
    success: true,
    comment: {
      id: String(ghComment.id),
      content,
      createdAt: new Date(ghComment.createdAt),
      author: {
        name: session.user.name ?? null,
        email: authorEmail,
        image: (session.user as { image?: string | null }).image ?? null,
      },
      emailRedacted,
    },
  }
}
