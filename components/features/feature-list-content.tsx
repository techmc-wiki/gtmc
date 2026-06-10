import { createElement } from "react"
import { getTranslations } from "next-intl/server"
import {
  labelsToStatus,
  labelsToTags,
  parseIssueBody,
  type GithubIssue,
} from "@/lib/github"
import { PageHeader } from "@/components/ui/page-header"
import { FeatureList } from "@/app/[locale]/(private)/features/feature-list"
import { PendingCreationBanner } from "@/app/[locale]/(private)/features/pending-creation-banner"
import { FeaturesAuthGate } from "@/components/features/features-auth-gate"

function buildFeatures(issues: GithubIssue[]) {
  const allIssues = [...issues]
  allIssues.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  return allIssues.map((issue) => {
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
}

interface FeatureListContentProps {
  issues: GithubIssue[]
  createLabel: string
  created?: string | string[] | undefined
}

export async function FeatureListContent({
  issues,
  createLabel,
  created,
}: FeatureListContentProps) {
  const t = await getTranslations("Feature")
  const isCreated = created === "true"

  const features = buildFeatures(issues)
  const action = createElement(FeaturesAuthGate, { createLabel })

  return (
    <div className="page-container-pb">
      <PageHeader
        title={t("pageTitle")}
        subtitle={t("pageSubtitle")}
        topMargin
        action={action}
      />

      {isCreated && <PendingCreationBanner />}

      <div className="mt-8">
        <FeatureList features={features} />
      </div>
    </div>
  )
}
