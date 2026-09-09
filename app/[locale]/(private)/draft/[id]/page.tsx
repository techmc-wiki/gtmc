import { IconButton } from "@/components/ui/icon-button"
import { getTranslations } from "next-intl/server"
import { ArrowLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import { DraftEditor } from "@/components/editor/draft-editor"
import { Link } from "@/i18n/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { decodeStoredDraftFiles } from "@/lib/drafts/files"
import { notFound, redirect } from "next/navigation"
import { readFile } from "fs/promises"
import path from "path"

function buildDraftEditorData(
  draft: {
    id: string
    title: string
    status: string
    githubPrUrl: string | null
  },
  draftFiles: ReturnType<typeof decodeStoredDraftFiles>,
  contributingGuides: Awaited<ReturnType<typeof loadContributingGuides>>
) {
  return {
    activeFileId: draftFiles.activeFileId,
    id: draft.id,
    files: draftFiles.files,
    folders: draftFiles.folders,
    title: draft.title,
    githubPrUrl: draft.githubPrUrl || undefined,
    status: draft.status,
    contributingGuides,
  }
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function EditDraftPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const t = await getTranslations("Editor")
  const { id } = await params

  const draft = await prisma.revision.findUnique({
    where: { id },
  })

  if (!draft || draft.authorId !== session.user.id) {
    notFound()
  }

  const draftFiles = decodeStoredDraftFiles({
    content: draft.content,
    filePath: draft.filePath,
  })
  const contributingGuides = await loadContributingGuides()

  const draftEditorInitialData = buildDraftEditorData(
    draft,
    draftFiles,
    contributingGuides
  )

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-3">
      <header className="flex items-center justify-between gap-4">
        <IconButton asChild variant="ghost" label={t("backToDrafts")}>
          <Link href="/draft" aria-label={t("backToDrafts")}>
            <ArrowLeftIcon aria-hidden className="size-4" />
          </Link>
        </IconButton>
        <p className="text-tech-main/60 text-sm">{t("articleDraft")}</p>
      </header>
      <DraftEditor initialData={draftEditorInitialData} />
    </div>
  )
}

async function loadContributingGuides() {
  const guides = await Promise.all([
    readFile(path.join(process.cwd(), "CONTRIBUTING.md"), "utf8")
      .then((content) => ({ id: "web", title: "GTMC Web", content }))
      .catch(() => null),
    readFile(path.join(process.cwd(), "articles", "CONTRIBUTING.md"), "utf8")
      .then((content) => ({ id: "articles", title: "Articles", content }))
      .catch(() => null),
  ])

  return guides.filter(
    (
      guide
    ): guide is {
      id: string
      title: string
      content: string
    } => Boolean(guide)
  )
}
