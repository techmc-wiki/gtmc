import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { toAbsoluteUrl } from "@/lib/site-url"
import { listAllIssues } from "@/lib/github"
import { FeatureListContent } from "@/components/features/feature-list-content"
import { FeaturesAuthGate } from "@/components/features/features-auth-gate"



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
  const t = await getTranslations("Feature")
  const params = await searchParams
  const allIssues = await listAllIssues()

  return (
    <FeatureListContent
      issues={allIssues}
      action={<FeaturesAuthGate createLabel={`+ ${t("createButton")}`} />}
      created={params?.created}
    />
  )
}
