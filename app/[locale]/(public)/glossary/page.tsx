import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageHeader } from "@/components/ui/page-header"
import { GlossaryToolbar } from "@/components/glossary/glossary-toolbar"
import { loadGlossaryManifest } from "@/lib/glossary/manifest"
import { toAbsoluteUrl } from "@/lib/site-url"

const DEFAULT_COLUMNS: Record<string, string[]> = {
  en: ["Full Form (English)", "Short Form", "Description", "Related"],
  zh: [
    "Full Form (English)",
    "Short Form",
    "Description",
    "Chinese",
    "Related",
  ],
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Glossary" })
  const canonical = toAbsoluteUrl(`/${locale}/glossary`)

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: {
      canonical,
      languages: {
        en: toAbsoluteUrl("/en/glossary"),
        zh: toAbsoluteUrl("/zh/glossary"),
        "x-default": toAbsoluteUrl("/zh/glossary"),
      },
    },
    openGraph: {
      title: t("pageTitle"),
      description: t("pageDescription"),
      type: "website",
      url: canonical,
    },
  }
}

export default async function GlossaryIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Glossary" })

  const { entries } = await loadGlossaryManifest()
  const totalCount = entries.length
  const categoryCounts = new Map<string, number>()

  for (const entry of entries) {
    const category = entry.category?.trim()
    if (category) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
    }
  }

  const categories = [...categoryCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .toSorted((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="page-container-pb">
      <PageHeader
        title={t("pageTitle")}
        subtitle={t("pageDescription")}
        topMargin
      />

      <div className="mt-8">
        <GlossaryToolbar
          categories={categories}
          locale={locale}
          totalCount={totalCount}
          defaultColumns={DEFAULT_COLUMNS}
        />
      </div>
    </div>
  )
}
