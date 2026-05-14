import type { Metadata } from "next"
import { DraftEditor } from "@/components/editor/draft-editor"
import { Link } from "@/i18n/navigation"
import { TechButton } from "@/components/ui/tech-button"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { decodeStoredDraftFiles } from "@/lib/draft-files"
import { notFound, redirect } from "next/navigation"
import { readFile } from "fs/promises"
import path from "path"
import { ARTICLES_PATH } from "@/lib/article-fs-constants"

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

  const { id } = await params

  const draft = await prisma.revision.findUnique({
    where: { id },
  })

  if (!draft || draft.authorId !== session.user.id) {
    notFound()
  }

  const draftFiles = decodeStoredDraftFiles({
    content: draft.content,
    conflictContent: draft.conflictContent,
    filePath: draft.filePath,
  })

  const draftWorkspaceLabel =
    draftFiles.files.length > 1
      ? `FILES_[${draftFiles.files.length}]`
      : draftFiles.files[0]?.filePath || "DRAFT_WORKSPACE"
  const contributingGuides = await loadContributingGuides()

  return (
    <div className="relative mx-auto max-w-[1400px] space-y-6 p-4 md:p-8">
      <div className="from-tech-main/0 via-tech-main to-tech-main/0 absolute top-0 right-10 h-px w-24 bg-linear-to-r" />
      <div className="from-tech-main/0 via-tech-main/50 to-tech-main/0 absolute top-10 right-0 h-24 w-px bg-linear-to-b" />

      <div className="guide-line relative flex flex-col gap-3 border-b pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/draft">
            <TechButton
              variant="ghost"
              className="text-tech-main/70 hover:bg-tech-main/5 hover:text-tech-main h-9 gap-2 px-3 text-[10px] tracking-widest">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              ABORT_EDIT_SEQUENCE
            </TechButton>
          </Link>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="bg-tech-main/40 h-[2px] w-4" />
            <p className="text-tech-main-dark font-mono text-xl font-bold tracking-tighter uppercase">
              WORKSPACE_TERMINAL
            </p>
          </div>
          <p className="tracking-tech-wide text-tech-main/50 font-mono text-[9px] uppercase">
            TARGET_NODE // {draftWorkspaceLabel}
          </p>
        </div>
      </div>

      <div className="relative mx-auto w-full">
        {/* Subtle decorative scanline behind the editor */}
        <div className="pointer-events-none absolute inset-0 z-[-1] overflow-hidden">
          <div className="size-full bg-[linear-gradient(to_bottom,transparent_50%,rgb(var(--color-tech-main)/0.02)_50%)] bg-size-[100%_4px]" />
          <div className="bg-tech-main/10 absolute inset-x-0 top-0 h-[2px] animate-[tree-drop-in_10s_ease-in-out_infinite] shadow-[0_0_10px_rgb(var(--color-tech-main)/0.2)]" />
        </div>

        <DraftEditor
          initialData={{
            activeFileId: draftFiles.activeFileId,
            id: draft.id,
            files: draftFiles.files,
            folders: draftFiles.folders,
            title: draft.title,
            githubPrUrl: draft.githubPrUrl || undefined,
            status: draft.status,
            contributingGuides,
          }}
        />
      </div>
    </div>
  )
}

async function loadContributingGuides() {
  const guideTargets = [
    {
      id: "web",
      title: "GTMC Web",
      filePath: path.join(process.cwd(), "CONTRIBUTING.md"),
    },
    {
      id: "articles",
      title: "Articles",
      filePath: path.join(ARTICLES_PATH, "CONTRIBUTING.md"),
    },
  ]

  const guides = await Promise.all(
    guideTargets.map(async (guide) => {
      try {
        const content = await readFile(guide.filePath, "utf8")
        return {
          id: guide.id,
          title: guide.title,
          content,
        }
      } catch {
        return null
      }
    })
  )

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
