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
    <div
      className="
        mx-auto max-w-[1400px] space-y-6 p-4
        md:p-8 relative
      ">
      <div className="absolute top-0 right-10 w-24 h-[1px] bg-gradient-to-r from-tech-main/0 via-tech-main to-tech-main/0" />
      <div className="absolute top-10 right-0 h-24 w-[1px] bg-gradient-to-b from-tech-main/0 via-tech-main/50 to-tech-main/0" />
      
      <div
        className="
          flex flex-col gap-3 border-b border-tech-main/20 pb-6
          md:flex-row md:items-end md:justify-between relative
        ">
        <div className="flex items-center gap-4">
          <Link href="/draft">
            <TechButton variant="ghost" className="h-9 px-3 gap-2 tracking-widest text-[10px] text-tech-main/70 hover:text-tech-main hover:bg-tech-main/5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              ABORT_EDIT_SEQUENCE
            </TechButton>
          </Link>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="h-[2px] w-4 bg-tech-main/40" />
            <p
              className="
                font-mono text-xl tracking-tighter text-tech-main-dark font-bold uppercase
              ">
              WORKSPACE_TERMINAL
            </p>
          </div>
          <p className="font-mono text-[9px] tracking-[0.2em] text-tech-main/50 uppercase">
            TARGET_NODE // {draftWorkspaceLabel}
          </p>
        </div>
      </div>

      <div className="mx-auto w-full relative">
        {/* Subtle decorative scanline behind the editor */}
        <div className="absolute inset-0 pointer-events-none z-[-1] overflow-hidden">
          <div className="w-full h-full bg-[linear-gradient(to_bottom,transparent_50%,rgba(96,112,143,0.02)_50%)] bg-[length:100%_4px]" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-tech-main/10 shadow-[0_0_10px_rgba(96,112,143,0.2)] animate-[tree-drop-in_10s_ease-in-out_infinite]" />
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
      filePath: path.join(process.cwd(), "articles", "CONTRIBUTING.md"),
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
