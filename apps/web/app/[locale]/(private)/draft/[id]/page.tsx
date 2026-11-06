import { IconButton } from "@/components/ui/icon-button"
import { getTranslations } from "next-intl/server"
import { ArrowLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import { DraftEditor } from "@/components/editor/draft-editor"
import { Link } from "@/i18n/navigation"
import { readDraft, type DraftStatus } from "@/lib/drafts/store"
import { deriveDisplayStatus } from "@/lib/drafts/lifecycle"
import { getArticlePullRequest } from "@/lib/articles/pr"
import { auth } from "@/lib/auth"
import type { DraftFileCollection } from "@/lib/drafts/files"
import { notFound, redirect } from "next/navigation"
import { readFile } from "fs/promises"
import path from "path"

export interface ContributingGuide {
  id: string
  title: string
  content: string
}

function buildDraftEditorData(
  draft: {
    id: string
    title: string
    githubPrUrl: string | null
  },
  draftFiles: DraftFileCollection,
  etag: string,
  contributingGuides: ContributingGuide[],
  status: DraftStatus
) {
  return {
    activeFileId: draftFiles.activeFileId,
    id: draft.id,
    etag,
    files: draftFiles.files,
    folders: draftFiles.folders,
    title: draft.title,
    githubPrUrl: draft.githubPrUrl || undefined,
    status,
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

  const [{ id }, t, contributingGuides] = await Promise.all([
    params,
    getTranslations("Editor"),
    loadContributingGuides(),
  ])

  const record = await readDraft(session.user.id, id)
  if (!record || record.draft.kind !== "article") notFound()
  const draft = record.draft

  let displayStatus: DraftStatus = draft.status
  if (draft.githubPrNum) {
    try {
      displayStatus = deriveDisplayStatus(
        draft.status,
        await getArticlePullRequest(draft.githubPrNum)
      )
    } catch (error) {
      console.error(`Failed to fetch PR #${draft.githubPrNum}:`, error)
    }
  }

  const draftEditorInitialData = buildDraftEditorData(
    draft,
    draft,
    record.etag,
    contributingGuides,
    displayStatus
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
      <DraftEditor key={record.etag} initialData={draftEditorInitialData} />
    </div>
  )
}

async function loadContributingGuides() {
  // The guides live at the workspace root and in the articles submodule;
  // scripts/stage-draft-guides.ts copies them under data/contributing/ at
  // build time so this page never depends on the workspace layout.
  const guides = await Promise.all([
    readFile(path.join(process.cwd(), "data", "contributing", "web.md"), "utf8")
      .then((content) => ({ id: "web", title: "GTMC Web", content }))
      .catch(() => null),
    readFile(
      path.join(process.cwd(), "data", "contributing", "articles.md"),
      "utf8"
    )
      .then((content) => ({ id: "articles", title: "Articles", content }))
      .catch(() => null),
  ])

  return guides.filter((guide): guide is ContributingGuide => Boolean(guide))
}
