import { BrutalEditor } from "@/components/editor/brutal-editor"
import Link from "next/link"
import { BrutalButton } from "@/components/ui/brutal-button"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"

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

  // Only DRAFT or REJECTED statuses should be editable usually
  // If it is PENDING or APPROVED, maybe we show it as read-only,
  // but let's let them view it in the editor for now.

  return (
    <div className="
      mx-auto max-w-6xl space-y-8 p-4
      md:p-8
    ">
      <div className="
        relative flex flex-col items-start justify-between space-y-4 border-b
        border-tech-main/30 pb-4
        md:flex-row md:items-end md:space-y-0
      ">
        <div className="
          absolute -bottom-[5px] left-0 size-2 border border-tech-main/50
          bg-tech-main/20
        "></div>
        <div className="
          flex items-center space-x-4
          md:space-x-6
        ">
          <Link href="/draft">
            <BrutalButton variant="ghost" size="sm">
              {"<"} BACK
            </BrutalButton>
          </Link>
          <h1 className="
            font-mono text-xl tracking-tech-wide text-tech-main uppercase
            md:text-3xl
          ">
            EDIT_SUBMISSION
          </h1>
        </div>
        <div className="
          border border-tech-main/50 bg-tech-main/10 px-3 py-1 font-mono text-xs
          tracking-widest text-tech-main uppercase
        ">
          STATUS: [{draft.status}]
        </div>
      </div>

      <div className="
        relative mx-auto border border-tech-main/30 bg-tech-main/5 p-6
        backdrop-blur-sm
      ">
        <div className="
          absolute top-0 left-0 size-2 border-t border-l border-tech-main/50
        "></div>
        <div className="
          absolute right-0 bottom-0 size-2 border-r border-b border-tech-main/50
        "></div>

        {draft.status === "SUBMITTED" ? (
          <div className="
            mb-4 border border-tech-main/50 bg-tech-main/20 p-4 font-mono
            text-sm text-tech-main-dark
          ">
            {`// CAUTION: This revision is currently in [SUBMITTED] state. A PR has been opened on GitHub. Edits made here will not affect the open PR.`}
          </div>
        ) : null}

        <BrutalEditor
          initialData={{
            id: draft.id,
            title: draft.title,
            content: draft.content,
            filePath: draft.filePath || undefined,
            articleId: draft.articleId || undefined,
            status: draft.status,
          }}
        />
      </div>
    </div>
  )
}
