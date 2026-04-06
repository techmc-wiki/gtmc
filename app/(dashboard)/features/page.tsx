import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import {
  labelsToStatus,
  labelsToTags,
  listAllIssues,
  parseIssueBody,
} from "@/lib/github"
import Link from "next/link"
import { TechButton } from "@/components/ui/tech-button"
import { PageHeader } from "@/components/ui/page-header"
import { FeatureList } from "./feature-list"
import { PendingCreationBanner } from "./pending-creation-banner"
import { RevealSection } from "./reveal-helpers"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Feature Requests",
  description:
    "Browse and track feature requests for Technical Minecraft. Vote on ideas, report bugs, and suggest improvements.",
  openGraph: {
    title: "Feature Requests — Technical Minecraft",
    description: "Browse and track feature requests for Technical Minecraft.",
    type: "website",
  },
}

export default async function FeaturesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined
  }>
}) {
  const session = await auth()
  const params = await searchParams
  const isCreated = params?.created === "true"

  const allIssues = await listAllIssues()
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
          title="Feature Reports"
          subtitle="BUG REPORTS, FEATURE REQUESTS, AND ISSUE TRACKING"
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
                  + REPORT NEW FEATURE
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
