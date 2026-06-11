"use server"

import { getCurrentUserAuthContext, requireAuth } from "@/lib/auth-context"
import { revalidatePath } from "next/cache"
import { PATHS } from "@/lib/revalidation-paths"
import {
  createIssue,
  updateIssue,
  parseIssueBody,
  serializeIssueBody,
  ensureLabel,
  tagsToLabels,
  statusToLabels,
  labelsToStatus,
  getIssue,
  createMetadataFromSession,
  parseIssueNumber,
  type IssueMetadata,
} from "@/lib/github"
import { updateGithubIssueCache } from "@/lib/github/cache-tags"

async function sendQQBotNotification(payload: {
  type?: string
  text: string
  data?: Record<string, unknown>
}) {
  const QQ_BOT_WEBHOOK = process.env.QQ_BOT_WEBHOOK || ""

  if (!QQ_BOT_WEBHOOK) {
    console.log("[Mock QQ Bot] Would send payload to webhook: ", payload.text)
    return
  }

  try {
    const res = await fetch(QQ_BOT_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Send a structured payload that AstrBot can easily parse in a custom plugin
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      console.error("QQ Bot Webhook returned error HTTP status:", res.status)
    }
  } catch (error) {
    console.error("Failed to send QQ Bot Notification:", error)
  }
}

async function getFeatureByIssueNumber(issueNumber: number) {
  const issue = await getIssue(issueNumber)
  if (!issue) return null
  const parsed = parseIssueBody(issue.body)
  return { issue, parsed }
}

export async function createFeature(data: {
  title: string
  content: string
  tags: string[]
}) {
  const session = await requireAuth()

  const metadata = createMetadataFromSession(session)

  const body = serializeIssueBody(data.content, metadata, undefined)

  // Ensure all tag labels exist on the repo (independent idempotent operations)
  await Promise.all(data.tags.map((tag) => ensureLabel(tag)))

  const labels = [...tagsToLabels(data.tags), ...statusToLabels("PENDING")]

  const created = await createIssue(data.title, body, labels)
  updateGithubIssueCache(created.number)

  // Send structured payload for AstrBot
  await sendQQBotNotification({
    type: "new_feature",
    text: `New feature report from [${session.user.name || session.user.email}]: ${data.title}\nIssue #${created.number}`,
    data: {
      id: String(created.number),
      issueNumber: created.number,
      title: data.title,
      author: session.user.name || session.user.email,
      tags: data.tags,
      url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/features/${created.number}`,
    },
  })

  revalidatePath(PATHS.FEATURES)
  return {
    success: true,
    feature: {
      id: String(created.number),
      title: data.title,
      content: data.content,
      tags: data.tags,
    },
  }
}

export async function updateFeature(
  id: string,
  data: { title: string; content: string; tags: string[] }
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

  if (
    parsed.metadata?.appUserId !== session.user.id &&
    authContext.role !== "ADMIN"
  ) {
    throw new Error("Forbidden")
  }

  await Promise.all(data.tags.map((tag) => ensureLabel(tag)))

  const currentStatus = labelsToStatus(issue.labels)
  const newLabels = [
    ...tagsToLabels(data.tags),
    ...statusToLabels(currentStatus),
  ]

  const fallbackMetadata: IssueMetadata = {
    appUserId: "",
    authorName: null,
    authorEmail: null,
  }
  const newBody = serializeIssueBody(
    data.content,
    parsed.metadata ?? fallbackMetadata,
    parsed.explanation ?? undefined
  )

  await updateIssue(issue.number, {
    title: data.title,
    body: newBody,
    labels: newLabels,
  })
  updateGithubIssueCache(issue.number)

  revalidatePath(PATHS.FEATURES)
  revalidatePath(PATHS.FEATURE(id))
  return {
    success: true,
    feature: {
      id,
      title: data.title,
      content: data.content,
      tags: data.tags,
    },
  }
}
