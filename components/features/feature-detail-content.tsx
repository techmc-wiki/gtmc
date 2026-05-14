import type { Session } from "next-auth"
import { getTranslations } from "next-intl/server"
import { FeatureEditor } from "@/components/editor/feature-editor"
import { MetadataRow } from "@/components/ui/metadata-row"
import { FeatureStatusBadge } from "@/components/ui/status-badge"
import { TechCard } from "@/components/ui/tech-card"
import { FeatureActions } from "@/app/[locale]/(private)/features/[id]/feature-actions"
import { FeatureComments } from "@/app/[locale]/(private)/features/[id]/feature-comments"
import { FeatureExplanation } from "@/app/[locale]/(private)/features/[id]/feature-explanation"
import { FeatureReadonlyView } from "@/app/[locale]/(private)/features/[id]/feature-readonly-view"
import { RevealSection } from "@/app/[locale]/(private)/features/reveal-helpers"

interface FeatureComment {
  id: string
  content: string
  createdAt: Date
  author: {
    name: string | null
    email: string | null
    image: string | null
  }
  emailRedacted?: boolean
}

interface FeatureDetail {
  id: string
  issueNumber: number
  htmlUrl: string
  title: string
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED"
  tags: string[]
  createdAt: Date
  content: string
  explanation: string | null
  authorId: string
  assigneeId: string | null
  author: {
    name: string | null
    email: string | null
    image: string | null
  }
  assignee: {
    name: string | null
    email: string | null
    image: string | null
  } | null
  comments: FeatureComment[]
}

interface FeatureDetailContentProps {
  feature: FeatureDetail
  session: Session | null
  isAuthor: boolean
  isAssignee: boolean
  isAdmin: boolean
  isClosed: boolean
  structuredData: {
    name: string
    description: string
    url: string
    datePublished: string
    dateModified: string
  }
}

export async function FeatureDetailContent({
  feature,
  session,
  isAuthor,
  isAssignee,
  isAdmin,
  isClosed,
  structuredData,
}: FeatureDetailContentProps) {
  const t = await getTranslations("Feature")
  const canEdit = isAuthor || isAdmin

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4 sm:p-6 md:p-8">
      <RevealSection delay={0}>
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="border-tech-main inline-block border-b-2 pb-2 text-xl font-bold tracking-tighter uppercase sm:text-2xl md:text-3xl">
              {t("detailTitle")}
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
        <div className="relative border border-red-500/50 bg-red-500/5 p-4 font-mono text-xs tracking-wider text-red-600 uppercase backdrop-blur-sm sm:p-6 sm:text-sm">
          <div className="pointer-events-none absolute top-0 left-0 size-2 -translate-px border-t-2 border-l-2 border-red-500/50" />
          <div className="pointer-events-none absolute top-0 right-0 size-2 translate-x-px -translate-y-px border-t-2 border-r-2 border-red-500/50" />
          <div className="pointer-events-none absolute bottom-0 left-0 size-2 -translate-x-px translate-y-px border-b-2 border-l-2 border-red-500/50" />
          <div className="pointer-events-none absolute right-0 bottom-0 size-2 translate-px border-r-2 border-b-2 border-red-500/50" />

          <span className="flex items-center gap-2 font-bold">
            <span className="text-red-500">⚠</span> FEATURE DELETED (READ-ONLY)
          </span>
          <p className="mt-2 border-t border-dashed border-red-500/30 pt-2 text-xs tracking-normal normal-case opacity-80">
            This feature has been deleted. The content is preserved for
            historical reference. No changes can be made.
          </p>
        </div>
      )}

      <RevealSection delay={100}>
        <TechCard className="mb-8 p-4 sm:p-6">
          <div className="flex flex-col gap-2 font-mono text-xs sm:text-sm">
            <MetadataRow
              label={`${t("detailStatus")}:`}
              value={<FeatureStatusBadge status={feature.status} />}
            />
            <MetadataRow
              label="Author:"
              value={
                <span className="wrap-break-word">
                  {feature.author.name || feature.author.email || "Unknown"}
                </span>
              }
            />
            <MetadataRow
              label={`${t("detailAssignee")}:`}
              value={
                <span className="wrap-break-word">
                  {feature.assignee
                    ? feature.assignee.name || feature.assignee.email
                    : t("unknownUser")}
                </span>
              }
            />
            <MetadataRow
              label="Created:"
              value={
                <span suppressHydrationWarning>
                  {new Date(feature.createdAt).toLocaleString()}
                </span>
              }
            />
            {feature.issueNumber && feature.htmlUrl && (
              <MetadataRow
                label="GitHub:"
                value={
                  <div className="flex flex-wrap items-center gap-1">
                    Linked to
                    <a
                      href={feature.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-tech-main/50 text-tech-main hover:bg-tech-main/80 border-b font-mono wrap-break-word transition-colors hover:text-white">
                      Issue #{feature.issueNumber}
                    </a>
                  </div>
                }
              />
            )}
          </div>
        </TechCard>
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: structuredData.name,
            description: structuredData.description,
            url: structuredData.url,
            datePublished: structuredData.datePublished,
            dateModified: structuredData.dateModified,
            inLanguage: ["zh", "en"],
          }),
        }}
      />
    </div>
  )
}
