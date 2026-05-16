import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { getCurrentUserAuthContext } from "@/lib/auth-context"
import {
  EXPLANATION_MARKER,
  SYSTEM_COMMENT_MARKER,
  getIssue,
  labelsToStatus,
  labelsToTags,
  listIssueComments,
  parseCommentBody,
  parseIssueBody,
} from "@/lib/github"
import { generateDescription } from "@/lib/markdown"
import { notFound } from "next/navigation"
import { toAbsoluteUrl } from "@/lib/site-url"
import { FeatureDetailContent } from "@/components/features/feature-detail-content"
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> {
  const { locale, id } = await params
  const issueNumber = Number.parseInt(id, 10)
  if (isNaN(issueNumber)) return { title: "Feature Not Found" }

  const issue = await getIssue(issueNumber)
  if (!issue) return { title: "Feature Not Found" }

  const canonical = toAbsoluteUrl(`/${locale}/features/${issue.number}`)
  const description = generateDescription(issue.body ?? "", undefined, 155)

  return {
    title: issue.title,
    description,
    alternates: {
      canonical,
      languages: {
        zh: toAbsoluteUrl(`/zh/features/${issue.number}`),
        en: toAbsoluteUrl(`/en/features/${issue.number}`),
        "x-default": toAbsoluteUrl(`/zh/features/${issue.number}`),
      },
    },
    openGraph: {
      title: `${issue.title} — Feature Request`,
      description,
      type: "article",
      url: canonical,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: issue.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${issue.title} — Feature Request`,
      description,
      images: ["/opengraph-image"],
    },
  }
}

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const issueNumber = Number.parseInt(id, 10)
  if (Number.isNaN(issueNumber) || issueNumber <= 0) {
    notFound()
  }

  const session = await auth()
  let isAdmin = false

  if (session?.user?.id) {
    try {
      const ctx = await getCurrentUserAuthContext(session.user.id)
      isAdmin = ctx.role === "ADMIN"
    } catch {
      isAdmin = false
    }
  }

  const issue = await getIssue(issueNumber)
  if (!issue) {
    notFound()
  }

  const canonical = toAbsoluteUrl(`/${locale}/features/${issue.number}`)
  const description = generateDescription(issue.body ?? "", undefined, 155)

  const isClosed = issue.state === "closed"

  const parsedIssue = parseIssueBody(issue.body)
  const rawComments = await listIssueComments(issue.number)

  const comments = rawComments
    .filter(
      (comment) =>
        !comment.body.includes(EXPLANATION_MARKER) &&
        !comment.body.includes(SYSTEM_COMMENT_MARKER)
    )
    .map((comment) => {
      const parsedComment = parseCommentBody(comment.body)
      return {
        id: String(comment.id),
        content: parsedComment.content,
        createdAt: new Date(comment.createdAt),
        author: {
          name: parsedComment.metadata?.authorName ?? null,
          email: parsedComment.metadata?.authorEmail ?? null,
          image: null,
        },
        emailRedacted: parsedComment.metadata?.emailRedacted ?? false,
      }
    })

  const feature = {
    id: String(issue.number),
    issueNumber: issue.number,
    htmlUrl: issue.htmlUrl,
    title: issue.title,
    status: labelsToStatus(issue.labels),
    tags: labelsToTags(issue.labels),
    createdAt: new Date(issue.createdAt),
    content: parsedIssue.userContent,
    explanation: parsedIssue.explanation,
    authorId: parsedIssue.metadata?.appUserId ?? "",
    assigneeId: parsedIssue.metadata?.assigneeId ?? null,
    author: {
      name: parsedIssue.metadata?.authorName ?? null,
      email: parsedIssue.metadata?.authorEmail ?? null,
      image: null,
    },
    assignee: parsedIssue.metadata?.assigneeId
      ? {
          name: parsedIssue.metadata?.assigneeName ?? null,
          email: parsedIssue.metadata?.assigneeEmail ?? null,
          image: null,
        }
      : null,
    comments,
  }

  const isAuthor = session?.user?.id === feature.authorId
  const isAssignee = session?.user?.id === feature.assigneeId

  return (
    <FeatureDetailContent
      feature={feature}
      session={session}
      isAuthor={isAuthor}
      isAssignee={isAssignee}
      isAdmin={isAdmin}
      isClosed={isClosed}
      structuredData={{
        name: issue.title,
        description,
        url: canonical,
        datePublished: new Date(issue.createdAt).toISOString(),
        dateModified: new Date(issue.updatedAt).toISOString(),
      }}
    />
  )
}
