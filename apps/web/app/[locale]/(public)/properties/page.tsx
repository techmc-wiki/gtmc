import { Suspense } from "react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageHeader } from "@/components/ui/headings"
import { Skeleton } from "@/components/ui/shadcn/skeleton"
import { PropertyLookup } from "@/components/properties/property-lookup"
import { getPropertyCatalog } from "@/lib/properties/data"
import { toAbsoluteUrl } from "@/lib/site-url"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Properties" })
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: {
      canonical: toAbsoluteUrl(`/${locale}/properties`),
      languages: {
        en: toAbsoluteUrl("/en/properties"),
        zh: toAbsoluteUrl("/zh/properties"),
      },
    },
  }
}

export default async function PropertiesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const [t, catalog] = await Promise.all([
    getTranslations({ locale, namespace: "Properties" }),
    getPropertyCatalog("blocks"),
  ])
  return (
    <div className="page-container-pb">
      <PageHeader title={t("pageTitle")} topMargin />
      <div className="mt-6">
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <PropertyLookup initialCatalog={catalog} />
        </Suspense>
      </div>
    </div>
  )
}
