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
      tone="main"
      borderOpacity="muted"
      background="default"
      padding="spacious"
      hover="elevated"
      brackets="visible"
      bracketVariant="hover"
      pattern="grid"
      className="group relative flex h-auto flex-col justify-between sm:h-64">
      <div className="relative z-10">
        <div className="card-header-row border-b border-tech-main/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-2 items-center justify-center bg-tech-main/20">
              <div className="size-1 bg-tech-main group-hover:animate-target-blink" />
            </div>
            <DraftStatusBadge status={draft.displayStatus} />
            {draft.cleanupFailedCount > 0 ? (
              <span className="animate-pulse font-mono text-xs text-red-500 uppercase">
                ! CLEANUP_FAILED
              </span>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="mono-label text-tech-main/50">
              LAST_SYNC // {draft.updatedAt.toLocaleDateString()}
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
                    flex cursor-pointer items-center font-mono
                    text-[10px] text-red-500/70 uppercase transition-colors
                    hover:text-red-600 hover:underline
                  ">
                  [ TERMINATE ]
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <h3
            className="
              line-clamp-2 border-l-2 border-tech-main/40 pl-3 text-lg
              font-bold tracking-tight text-tech-main-dark uppercase
              transition-colors group-hover:border-tech-main
            ">
            {draft.title || "UNTITLED_DOCUMENT"}
          </h3>

          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-tech-main/10 pt-3">
            <div className="flex flex-col">
              <span className="mono-label text-tech-main/40">SYS_REF</span>
              <span className="truncate font-mono text-xs text-tech-main/80">
                {draft.id.split("-")[0]}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="mono-label text-tech-main/40">FILE_METRICS</span>
              <span className="font-mono text-xs text-tech-main/80">
                {draft.fileCount} NODE(S)
              </span>
            </div>
          </div>
        </div>
      </div>

      <Link
        href={`/draft/${draft.id}`}
        className="
          relative z-10 mt-6
          sm:mt-auto
        ">
        <TechButton
          variant="ghost"
          className="
            min-h-11 w-full border guide-line bg-tech-main/5 font-mono
            text-xs tracking-widest transition-all
            group-hover:border-tech-main/60 group-hover:bg-tech-main/10
            group-hover:text-tech-main-dark
          ">
          <span className="flex w-full items-center justify-between px-2">
            <span>
              {draft.displayStatus === "DRAFT" ||
              draft.displayStatus === "CLOSED"
                ? "INIT_EDIT_SEQUENCE"
                : "ENGAGE_VIEWER"}
            </span>
            <span className="opacity-0 transition-opacity group-hover:animate-target-blink group-hover:opacity-100">
              {">"}
            </span>
          </span>
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
