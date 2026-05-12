import type { Session } from "next-auth"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import {
  labelsToStatus,
  labelsToTags,
  parseIssueBody,
  type GithubIssue,
} from "@/lib/github"
import { PageHeader } from "@/components/ui/page-header"
import { TechButton } from "@/components/ui/tech-button"
import { FeatureList } from "@/app/[locale]/(private)/features/feature-list"
import { PendingCreationBanner } from "@/app/[locale]/(private)/features/pending-creation-banner"
import { RevealSection } from "@/app/[locale]/(private)/features/reveal-helpers"

interface FeatureListContentProps {
  issues: GithubIssue[]
  session: Session | null
  created?: string | string[] | undefined
}

export async function FeatureListContent({
  issues,
  session,
  created,
}: FeatureListContentProps) {
  const t = await getTranslations("Feature")
  const isCreated = created === "true"

  const allIssues = [...issues]
  allIssues.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const features = allIssues.map((issue) => {
    const parsed = parseIssueBody(issue.body)
    const assigneeId = parsed.metadata?.assigneeId

    return {
      id: String(issue.number),
      title: issue.title,
      status: labelsToStatus(issue.labels),
      tags: labelsToTags(issue.labels),
      createdAt: new Date(issue.createdAt),
      author: {
        name: parsed.metadata?.authorName || undefined,
        email: parsed.metadata?.authorEmail || undefined,
        image: undefined,
      },
      assignee: assigneeId
        ? {
            name: parsed.metadata?.assigneeName || undefined,
            email: parsed.metadata?.assigneeEmail || undefined,
            image: undefined,
          }
        : undefined,
    }
  })

  return (
    <div className="page-container-pb">
      <RevealSection delay={0}>
        <PageHeader
          title={t("pageTitle")}
          subtitle={t("pageSubtitle")}
          topMargin
          action={
            session?.user ? (
              <Link
                href="/features/new"
                className="
                  w-full
                  md:w-auto
                ">
                <TechButton
                  variant="primary"
                  className="
                    flex min-h-[44px] w-full items-center justify-center px-6
                    text-xs tracking-widest uppercase transition-transform
                    hover:scale-[1.02]
                    md:w-auto
                  ">
                  + {t("createButton")}
                </TechButton>
              </Link>
            ) : undefined
          }
        />

        {isCreated && <PendingCreationBanner />}
      </RevealSection>

      <RevealSection delay={100}>
        <div className="mt-8">
          <FeatureList features={features} />
        </div>
      </RevealSection>
    </div>
  )
}
