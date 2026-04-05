import type { Metadata } from "next"
import { auth } from "@/lib/auth"
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
import { FeatureEditor } from "@/components/editor/feature-editor"
import { notFound } from "next/navigation"
import { BrutalCard } from "@/components/ui/brutal-card"
import { FeatureActions } from "./feature-actions"
import { FeatureComments } from "./feature-comments"
import { FeatureExplanation } from "./feature-explanation"
import { FeatureReadonlyView } from "./feature-readonly-view"
import { FeatureStatusBadge } from "@/components/ui/status-badge"
import { RevealSection } from "@/app/(dashboard)/features/reveal-helpers"
import { toAbsoluteUrl } from "@/lib/site-url"
import { MetadataRow } from "./metadata-row"

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const issueNumber = Number.parseInt(id, 10)
  if (isNaN(issueNumber)) return { title: "Feature Not Found" }

  const issue = await getIssue(issueNumber)
  if (!issue) return { title: "Feature Not Found" }

  const canonical = toAbsoluteUrl(`/features/${issue.number}`)
  const description = generateDescription(issue.body ?? "", undefined, 155)

  return {
    title: issue.title,
    description,
    alternates: {
      canonical,
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
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const issueNumber = Number.parseInt(id, 10)
  if (Number.isNaN(issueNumber) || issueNumber <= 0) {
    notFound()
  }

  const session = await auth()

  const issue = await getIssue(issueNumber)
  if (!issue) {
    notFound()
  }

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
  const isAdmin = session?.user?.role === "ADMIN"
  const isAssignee = session?.user?.id === feature.assigneeId

  const canEdit = isAuthor || isAdmin

  return (
    <div
      className="
        container mx-auto max-w-4xl space-y-6 p-4
        sm:p-6
        md:p-8
      ">
      <RevealSection delay={0}>
        <div className="flex flex-col gap-4">
          <div>
            <h1
              className="
                inline-block border-b-2 border-tech-main pb-2 text-xl font-bold
                tracking-tighter uppercase
                sm:text-2xl
                md:text-3xl
              ">
              {canEdit ? "Edit Feature" : "View Feature"}
            </h1>
          </div>

          {/* Status Actions for logged in users */}
          {session?.user && !isClosed && (
            <FeatureActions
              featureId={feature.id}
              status={feature.status}
              isAssignee={isAssignee}
              isAdmin={isAdmin}
              hasAssignee={!!feature.assigneeId}
            />
          )}
        </div>
      </RevealSection>

      {isClosed && (
        <div
          className="
            relative border border-red-500/50 bg-red-500/5 p-4 font-mono text-xs
            tracking-wider text-red-600 uppercase backdrop-blur-sm
            sm:p-6 sm:text-sm
          ">
          <div
            className="
              pointer-events-none absolute top-0 left-0 size-2 -translate-px
              border-t-2 border-l-2 border-red-500/50
            "
          />
          <div
            className="
              pointer-events-none absolute top-0 right-0 size-2 translate-x-px
              -translate-y-px border-t-2 border-r-2 border-red-500/50
            "
          />
          <div
            className="
              pointer-events-none absolute bottom-0 left-0 size-2
              -translate-x-px translate-y-px border-b-2 border-l-2
              border-red-500/50
            "
          />
          <div
            className="
              pointer-events-none absolute right-0 bottom-0 size-2 translate-px
              border-r-2 border-b-2 border-red-500/50
            "
          />

          <span className="flex items-center gap-2 font-bold">
            <span className="text-red-500">⚠</span> FEATURE DELETED (READ-ONLY)
          </span>
          <p
            className="
              mt-2 border-t border-dashed border-red-500/30 pt-2 text-xs
              tracking-normal normal-case opacity-80
            ">
            This feature has been deleted. The content is preserved for
            historical reference. No changes can be made.
          </p>
        </div>
      )}

      <RevealSection delay={100}>
        <BrutalCard
          className="
            mb-8 p-4
            sm:p-6
          ">
          <div
            className="
              flex flex-col gap-2 font-mono text-xs
              sm:text-sm
            ">
            <MetadataRow
              label="STATUS:"
              value={<FeatureStatusBadge status={feature.status} />}
            />
            <MetadataRow
              label="AUTHOR:"
              value={
                <span className="wrap-break-word">
                  {feature.author.name || feature.author.email || "Unknown"}
                </span>
              }
            />
            <MetadataRow
              label="ASSIGNEE:"
              value={
                <span className="wrap-break-word">
                  {feature.assignee
                    ? feature.assignee.name || feature.assignee.email
                    : "Unassigned"}
                </span>
              }
            />
            <MetadataRow
              label="CREATED:"
              value={
                <span suppressHydrationWarning>
                  {new Date(feature.createdAt).toLocaleString()}
                </span>
              }
            />
            {feature.issueNumber && feature.htmlUrl && (
              <MetadataRow
                label="GITHUB:"
                value={
                  <div className="flex flex-wrap items-center gap-1">
                    Linked to
                    <a
                      href={feature.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        border-b border-tech-main/50 font-mono wrap-break-word
                        text-tech-main transition-colors
                        hover:bg-tech-main/80 hover:text-white
                      ">
                      Issue #{feature.issueNumber}
                    </a>
                  </div>
                }
              />
            )}
          </div>
        </BrutalCard>
      </RevealSection>

      <RevealSection delay={200}>
        <FeatureExplanation
          featureId={feature.id}
          initialExplanation={feature.explanation}
          isAssignee={isAssignee}
          isAdmin={isAdmin}
          isClosed={isClosed}
        />
      </RevealSection>

      <RevealSection delay={300}>
        <div>
          {!isClosed && canEdit ? (
            <FeatureEditor
              initialData={{
                id: feature.id,
                title: feature.title,
                content: feature.content,
                tags: feature.tags,
                status: feature.status,
              }}
            />
          ) : (
            <FeatureReadonlyView
              title={feature.title}
              content={feature.content}
              tags={feature.tags}
            />
          )}
        </div>
      </RevealSection>

      <RevealSection delay={400}>
        <FeatureComments
          featureId={feature.id}
          initialComments={feature.comments}
          userId={session?.user?.id}
          isClosed={isClosed}
        />
      </RevealSection>
    </div>
  )
}
