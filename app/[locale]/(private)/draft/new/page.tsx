import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"

import { createDraftAction } from "@/actions/article-draft"
import { Button } from "@/components/ui/shadcn/button"
import { Input } from "@/components/ui/shadcn/input"
import { auth } from "@/lib/auth"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function NewDraftPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const { file: fileParam } = await searchParams
  const filePath = typeof fileParam === "string" ? fileParam : ""
  const t = await getTranslations("Drafts")

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
        <Button type="submit" variant="primary">
          {t("createDraft")}
        </Button>
      </form>
    </main>
  )
}
