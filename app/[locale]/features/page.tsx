import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { toAbsoluteUrl } from "@/lib/site-url"
import { listAllIssues } from "@/lib/github"
import { FeatureListContent } from "@/components/features/feature-list-content"

export const revalidate = 60

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
      "Browse and track feature requests for Technical Minecraft. Vote on ideas, report bugs, and suggest improvements.",
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
      description: "Browse and track feature requests for Technical Minecraft.",
      type: "website",
      url: canonical,
    },
  }
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
  const allIssues = await listAllIssues()

  return (
    <FeatureListContent
      issues={allIssues}
      session={session}
      created={params?.created}
    />
  )
}
