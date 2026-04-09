import type { Metadata } from "next"
import { TechCard } from "@/components/ui/tech-card"
import { TechButton } from "@/components/ui/tech-button"
import { Link } from "@/i18n/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { deleteDraftAction } from "@/actions/article"
import { getPR } from "@/lib/github/pr-manager"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { DraftStatusBadge } from "@/components/ui/status-badge"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { SectionTitle } from "@/components/ui/section-title"
import { decodeStoredDraftFiles } from "@/lib/draft-files"
import { countCleanupFailedByRevision } from "@/lib/draft-asset-db"

const ARCHIVED_DRAFT_STATUSES = new Set([
  "APPROVED",
  "ARCHIVED",
  "MERGED",
  "CLOSED",
])

const NON_DELETABLE_DRAFT_STATUSES = new Set([
  "PENDING",
  "APPROVED",
  "IN_REVIEW",
  "SYNC_CONFLICT",
  "MERGED",
  "CLOSED",
])

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function DraftDashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const allDraftsRaw = await prisma.revision.findMany({
    where: {
      authorId: session.user.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  const cleanupFailedByRevisionId = new Map<string, number>()
  if (allDraftsRaw.length > 0) {
    const counts = await countCleanupFailedByRevision(
      allDraftsRaw.map((draft) => draft.id)
    )
    for (const [revisionId, count] of counts) {
      cleanupFailedByRevisionId.set(revisionId, count)
    }
  }

  const allDrafts = await Promise.all(
    allDraftsRaw.map(async (d) => {
      let displayStatus = d.status
      const decodedDraft = decodeStoredDraftFiles({
        content: d.content,
        conflictContent: d.conflictContent,
        filePath: d.filePath,
      })

      if (d.githubPrNum) {
        try {
          const pr = await getPR(d.githubPrNum)
          if (pr.state === "closed") {
            displayStatus = pr.merged ? "MERGED" : "CLOSED"
          }
        } catch (e) {
          console.error(`Failed to fetch PR #${d.githubPrNum}:`, e)
        }
      }
      return {
        ...d,
        cleanupFailedCount: cleanupFailedByRevisionId.get(d.id) ?? 0,
        displayStatus,
        fileCount: decodedDraft.files.length,
      }
    })
  )

  const activeDrafts = allDrafts.filter(
    (d) => !ARCHIVED_DRAFT_STATUSES.has(d.displayStatus)
  )
  const archivedDrafts = allDrafts.filter((d) =>
    ARCHIVED_DRAFT_STATUSES.has(d.displayStatus)
  )

  const renderDraftCard = (draft: (typeof allDrafts)[0]) => (
    <TechCard
      key={draft.id}
      className="
        group relative flex h-auto flex-col justify-between border
        border-tech-main/40 bg-white/80 p-6 backdrop-blur-sm
        sm:h-64
      ">
      {/* Corner brackets */}
      <CornerBrackets variant="hover" />

      <div className="relative z-10">
        <div className="card-header-row">
          <div className="flex items-center gap-2">
            <DraftStatusBadge status={draft.displayStatus} />
            {draft.cleanupFailedCount > 0 ? (
              <span className="font-mono text-xs text-red-500 uppercase">
                CLEANUP_FAILED_
              </span>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="mono-label">
              {draft.updatedAt.toLocaleDateString()}
            </span>
            {!NON_DELETABLE_DRAFT_STATUSES.has(draft.displayStatus) && (
                <form
                  action={async () => {
                    "use server"
                    await deleteDraftAction(draft.id)
                  }}>
                  <button
                    type="submit"
                    className="
                      flex min-h-11 cursor-pointer items-center font-mono
                      text-xs text-red-500 uppercase
                      hover:text-red-700 hover:underline
                    ">
                    [DELETE]
                  </button>
                </form>
              )}
          </div>
        </div>
        <h3
          className="
            mt-2 line-clamp-2 border-l-2 border-tech-main/40 pl-3 text-lg
            font-bold tracking-tight text-tech-main-dark uppercase
          ">
          {draft.title || "UNTITLED_DOCUMENT"}
        </h3>
        {draft.fileCount > 1 ? (
          <p
            className="
              mt-3 font-mono text-xs tracking-widest text-tech-main/70 uppercase
            ">
            FILE_SET: {draft.fileCount}
          </p>
        ) : null}
      </div>

      <Link
        href={`/draft/${draft.id}`}
        className="
          relative z-10 mt-4
          sm:mt-auto
        ">
        <TechButton
          variant="ghost"
          className="
            min-h-11 w-full border border-tech-main/40 bg-white/50 font-mono
            text-xs tracking-widest transition-all
            hover:border-tech-main/60 hover:bg-white/80
          ">
          {draft.displayStatus === "DRAFT" || draft.displayStatus === "CLOSED"
            ? "> EDIT_RECORD"
            : "> VIEW_STREAM"}
        </TechButton>
      </Link>
    </TechCard>
  )

  return (
    <div className="page-container">
      <PageHeader
        title="Ops Center"
        subtitle="YOUR DIGITAL WORKSHOP / DRAFTS & REVISIONS"
        action={
          <Link
            href="/draft/new"
            className="
              w-full
              md:w-auto
            ">
            <TechButton
              variant="primary"
              className="
                flex min-h-11 w-full items-center justify-center px-6 text-xs
                tracking-widest uppercase transition-transform
                hover:scale-[1.02]
                md:w-auto
              ">
              + INITIALIZE SUBMISSION
            </TechButton>
          </Link>
        }
      />

      <div className="space-y-8">
        <div>
          <SectionTitle>Active Records</SectionTitle>
          <div
            className="
              grid grid-cols-1 gap-6
              md:grid-cols-2
              lg:grid-cols-3
            ">
            {activeDrafts.length === 0 ? (
              <EmptyState message="NO ACTIVE RECORDS FOUND." colSpanFull />
            ) : (
              activeDrafts.map(renderDraftCard)
            )}
          </div>
        </div>

        {archivedDrafts.length > 0 && (
          <div>
            <SectionTitle>Archived / Approved Records</SectionTitle>
            <div
              className="
                grid grid-cols-1 gap-6
                md:grid-cols-2
                lg:grid-cols-3
              ">
              {archivedDrafts.map(renderDraftCard)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
