import type { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { toAbsoluteUrl } from "@/lib/site-url"
import { listAllIssues, type GithubIssue } from "@/lib/github"
import { FeatureListContent } from "@/components/features/feature-list-content"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const canonical = toAbsoluteUrl(`/${locale}/features`)
  return {
    title: "Feature Requests",
    description:
      "Browse and track feature requests for Graduate Texts in Minecraft. Vote on ideas, report bugs, and suggest improvements to the technical Minecraft textbook.",
    alternates: {
      canonical,
      languages: {
        zh: toAbsoluteUrl("/zh/features"),
        en: toAbsoluteUrl("/en/features"),
        "x-default": toAbsoluteUrl("/zh/features"),
      },
    },
    openGraph: {
      title: "Feature Requests — Technical Minecraft",
      description:
        "Browse and track feature requests for Graduate Texts in Minecraft. Vote on ideas, report bugs, and suggest improvements to the technical Minecraft textbook.",
      type: "website",
      url: canonical,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "Feature Requests — Technical Minecraft",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Feature Requests — Technical Minecraft",
      description:
        "Browse and track feature requests for Graduate Texts in Minecraft. Vote on ideas, report bugs, and suggest improvements to the technical Minecraft textbook.",
      images: ["/opengraph-image"],
    },
  }
}

export default async function FeaturesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined
  }>
}) {
  const { locale } = await params
  const [t, allIssues] = await Promise.all([
    getTranslations({ locale, namespace: "Feature" }),
    listAllIssues(),
  ])
  const createLabel = `+ ${t("createButton")}`

  return (
    <Suspense
      fallback={
        <FeatureListContent
          issues={allIssues}
          createLabel={createLabel}
          locale={locale}
        />
      }>
      <FeaturesWithSearchParams
        issues={allIssues}
        createLabel={createLabel}
        locale={locale}
        searchParams={searchParams}
      />
    </Suspense>
  )
}

async function FeaturesWithSearchParams({
  issues,
  createLabel,
  locale,
  searchParams,
}: {
  issues: GithubIssue[]
  createLabel: string
  locale: string
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined
  }>
}) {
  const resolved = await searchParams

  return (
    <FeatureListContent
      issues={issues}
      createLabel={createLabel}
      locale={locale}
      created={resolved?.created}
    />
  )
}
