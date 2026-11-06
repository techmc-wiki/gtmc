import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { createDraftAction } from "@/actions/article-draft"
import { Button } from "@/components/ui/shadcn/button"
import { Input } from "@/components/ui/shadcn/input"
import { SegmentedBar } from "@/components/ui/loading-shell-primitives"
import { auth } from "@/lib/auth"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function NewDraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Drafts" })

  return (
    <main className="mx-auto max-w-xl space-y-6 p-4 md:p-8">
      <header className="border-tech-main/40 border-b pb-4">
        <h1 className="display-title text-tech-main-dark text-3xl">
          {t("newArticleDraftTitle")}
        </h1>
        <p className="text-tech-main/70 mt-2 text-sm/relaxed">
          {t("newArticleDraftDescription")}
        </p>
      </header>
      <Suspense fallback={<NewDraftFormFallback />}>
        <NewDraftForm locale={locale} searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function NewDraftForm({
  locale,
  searchParams,
}: {
  locale: string
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const { file: fileParam } = await searchParams
  const filePath = typeof fileParam === "string" ? fileParam : ""
  const t = await getTranslations({ locale, namespace: "Drafts" })

  return (
    <form
      action={createDraftAction}
      className="border-tech-main/40 bg-surface-overlay/80 space-y-5 border p-4 backdrop-blur-sm sm:p-6">
      <div className="space-y-2">
        <label
          htmlFor="draft-file-path"
          className="text-tech-main/60 text-xs font-medium">
          {t("existingFilePath")}
        </label>
        <Input
          id="draft-file-path"
          name="filePath"
          defaultValue={filePath}
          placeholder="e.g. SlimeTech/Molforte/04-new-machine.md"
        />
        <p className="text-tech-main/60 text-xs/relaxed">
          {t("existingFilePathHint")}
        </p>
      </div>
      <Button type="submit">{t("createDraft")}</Button>
    </form>
  )
}

function NewDraftFormFallback() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="border-tech-main/40 bg-surface-overlay/80 space-y-5 border p-4 backdrop-blur-sm sm:p-6">
      <div className="space-y-2">
        <SegmentedBar opacity="low" className="h-3 w-28" />
        <SegmentedBar opacity="medium" showBorder className="h-10 w-full" />
      </div>
      <SegmentedBar opacity="high" className="h-9 w-32" />
    </div>
  )
}
