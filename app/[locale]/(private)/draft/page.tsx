import type { Metadata } from "next"
import type { GlossaryRevision, Revision } from "@prisma/client"

import { TechCard } from "@/components/ui/tech-card"
import { TechButton } from "@/components/ui/tech-button"
import { Link } from "@/i18n/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { deleteDraftAction } from "@/actions/article-draft"
import { deleteGlossaryDraftAction } from "@/actions/glossary-draft"
import { getPR } from "@/lib/github/pr-manager"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { DraftStatusBadge } from "@/components/ui/status-badge"
import { SectionTitle } from "@/components/ui/section-title"
import { decodeStoredDraftFiles } from "@/lib/drafts/files"
import { countCleanupFailedByRevision } from "@/lib/drafts/asset-db"

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

const ARCHIVED_GLOSSARY_STATUSES = new Set(["SUBMITTED"])

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

type ArticleDraftItem = {
  kind: "article"
  cleanupFailedCount: number
  displayStatus: string
  fileCount: number
} & Revision

type GlossaryDraftItem = {
  kind: "glossary"
} & GlossaryRevision

type DraftItem = ArticleDraftItem | GlossaryDraftItem

function renderGlossaryCard(draft: GlossaryDraftItem) {
  const ops = Array.isArray(draft.operations)
    ? (draft.operations as Array<{ kind: string }>)
    : []
  const editCount = ops.filter((o) => o.kind === "edit").length
  const addCount = ops.filter((o) => o.kind === "add").length
  const deleteCount = ops.filter((o) => o.kind === "delete").length
  const opSummary = [
    editCount > 0 ? `edit ${editCount}` : null,
    addCount > 0 ? `add ${addCount}` : null,
    deleteCount > 0 ? `delete ${deleteCount}` : null,
  ]
    .filter(Boolean)
    .join(", ")

  return (
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
        <div className="card-header-row border-tech-main/10 border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="bg-tech-main/20 flex size-2 items-center justify-center">
              <div className="bg-tech-main group-hover:animate-target-blink size-1" />
            </div>
            <span className="border-tech-main/40 bg-tech-main/5 text-tech-main shrink-0 border px-2 py-0.5 font-mono text-xs tracking-wider">
              [GLOSSARY]
            </span>
            <DraftStatusBadge status={draft.status} />
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="mono-label text-tech-main/50">
              LAST_SYNC // {draft.updatedAt.toLocaleDateString()}
            </span>
            {draft.status === "DRAFT" && (
              <form
                action={async () => {
                  "use server"
                  await deleteGlossaryDraftAction(draft.id)
                }}>
                <button
                  type="submit"
                  className="flex cursor-pointer items-center font-mono text-[10px] text-red-500/70 uppercase transition-colors hover:text-red-600 hover:underline">
                  [ TERMINATE ]
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <h3 className="border-tech-main/40 text-tech-main-dark group-hover:border-tech-main line-clamp-2 border-l-2 pl-3 text-lg font-bold tracking-tight uppercase transition-colors">
            {draft.title || "GLOSSARY_REVISION"}
          </h3>

          <div className="border-tech-main/10 mt-2 grid grid-cols-2 gap-2 border-t pt-3">
            <div className="flex flex-col">
              <span className="mono-label text-tech-main/40">SYS_REF</span>
              <span className="text-tech-main/80 truncate font-mono text-xs">
                {draft.id.split("-")[0]}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="mono-label text-tech-main/40">OPS</span>
              <span className="text-tech-main/80 truncate font-mono text-xs">
                {opSummary || "NO_OPS"}
              </span>
            </div>
          </div>

          {draft.status === "SUBMITTED" && draft.githubPrUrl && (
            <a
              href={draft.githubPrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-tech-main/60 hover:text-tech-main mt-1 font-mono text-xs transition-colors">
              PR ↗
            </a>
          )}
        </div>
      </div>

      <Link
        href={`/glossary/edit/${draft.id}`}
        className="relative z-10 mt-6 sm:mt-auto">
        <TechButton
          variant="ghost"
          className="guide-line bg-tech-main/5 group-hover:border-tech-main/60 group-hover:bg-tech-main/10 group-hover:text-tech-main-dark min-h-11 w-full border font-mono text-xs tracking-widest transition-all">
          <span className="flex w-full items-center justify-between px-2">
            <span>
              {draft.status === "DRAFT"
                ? "INIT_EDIT_SEQUENCE"
                : "ENGAGE_VIEWER"}
            </span>
            <span className="group-hover:animate-target-blink opacity-0 transition-opacity group-hover:opacity-100">
              {">"}
            </span>
          </span>
        </TechButton>
      </Link>
    </TechCard>
  )
}

export default async function DraftDashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const authorId = session.user.id

  const allDraftsRaw = await prisma.revision.findMany({
    where: { authorId },
    orderBy: { updatedAt: "desc" },
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

  const articleDrafts: ArticleDraftItem[] = await Promise.all(
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
        } catch (error) {
          console.error(`Failed to fetch PR #${d.githubPrNum}:`, error)
        }
      }
      return Object.assign({}, d, {
        kind: "article" as const,
        cleanupFailedCount: cleanupFailedByRevisionId.get(d.id) ?? 0,
        displayStatus,
        fileCount: decodedDraft.files.length,
      })
    })
  )

  const glossaryDraftsRaw = await prisma.glossaryRevision.findMany({
    where: { authorId },
    orderBy: { updatedAt: "desc" },
  })

  const glossaryDrafts: GlossaryDraftItem[] = glossaryDraftsRaw.map((d) =>
    Object.assign({}, d, { kind: "glossary" as const })
  )

  const allItems: DraftItem[] = [...articleDrafts, ...glossaryDrafts].toSorted(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  )

  const activeItems = allItems.filter((item) => {
    if (item.kind === "article") {
      return !ARCHIVED_DRAFT_STATUSES.has(item.displayStatus)
    }
    return !ARCHIVED_GLOSSARY_STATUSES.has(item.status)
  })

  const archivedItems = allItems.filter((item) => {
    if (item.kind === "article") {
      return ARCHIVED_DRAFT_STATUSES.has(item.displayStatus)
    }
    return ARCHIVED_GLOSSARY_STATUSES.has(item.status)
  })

  const renderArticleCard = (draft: ArticleDraftItem) => (
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
        <div className="card-header-row border-tech-main/10 border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="bg-tech-main/20 flex size-2 items-center justify-center">
              <div className="bg-tech-main group-hover:animate-target-blink size-1" />
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
                  className="flex cursor-pointer items-center font-mono text-[10px] text-red-500/70 uppercase transition-colors hover:text-red-600 hover:underline">
                  [ TERMINATE ]
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <h3 className="border-tech-main/40 text-tech-main-dark group-hover:border-tech-main line-clamp-2 border-l-2 pl-3 text-lg font-bold tracking-tight uppercase transition-colors">
            {draft.title || "UNTITLED_DOCUMENT"}
          </h3>

          <div className="border-tech-main/10 mt-2 grid grid-cols-2 gap-2 border-t pt-3">
            <div className="flex flex-col">
              <span className="mono-label text-tech-main/40">SYS_REF</span>
              <span className="text-tech-main/80 truncate font-mono text-xs">
                {draft.id.split("-")[0]}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="mono-label text-tech-main/40">FILE_METRICS</span>
              <span className="text-tech-main/80 font-mono text-xs">
                {draft.fileCount} NODE(S)
              </span>
            </div>
          </div>
        </div>
      </div>

      <Link
        href={`/draft/${draft.id}`}
        className="relative z-10 mt-6 sm:mt-auto">
        <TechButton
          variant="ghost"
          className="guide-line bg-tech-main/5 group-hover:border-tech-main/60 group-hover:bg-tech-main/10 group-hover:text-tech-main-dark min-h-11 w-full border font-mono text-xs tracking-widest transition-all">
          <span className="flex w-full items-center justify-between px-2">
            <span>
              {draft.displayStatus === "DRAFT" ||
              draft.displayStatus === "CLOSED"
                ? "INIT_EDIT_SEQUENCE"
                : "ENGAGE_VIEWER"}
            </span>
            <span className="group-hover:animate-target-blink opacity-0 transition-opacity group-hover:opacity-100">
              {">"}
            </span>
          </span>
        </TechButton>
      </Link>
    </TechCard>
  )

  const renderCard = (item: DraftItem) => {
    if (item.kind === "article") return renderArticleCard(item)
    return renderGlossaryCard(item)
  }

  // oxlint-disable-next-line react-perf/jsx-no-jsx-as-prop
  const pageAction = <DraftPageActions />

  return (
    <div className="page-container">
      <PageHeader
        title="Ops Center"
        subtitle="YOUR DIGITAL WORKSHOP / DRAFTS & REVISIONS"
        action={pageAction}
      />

      <div className="space-y-8">
        <div>
          <SectionTitle>Active Records</SectionTitle>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeItems.length === 0 ? (
              <EmptyState message="NO ACTIVE RECORDS FOUND." colSpanFull />
            ) : (
              activeItems.map(renderCard)
            )}
          </div>
        </div>

        {archivedItems.length > 0 && (
          <div>
            <SectionTitle>Archived / Approved Records</SectionTitle>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {archivedItems.map(renderCard)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DraftPageActions() {
  return (
    <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
      <Link href="/draft/new" className="w-full md:w-auto">
        <TechButton
          variant="primary"
          className="flex min-h-11 w-full items-center justify-center px-6 text-xs tracking-widest uppercase transition-transform hover:scale-[1.02] md:w-auto">
          + INITIALIZE SUBMISSION
        </TechButton>
      </Link>
      <Link href="/glossary/edit/new" className="w-full md:w-auto">
        <TechButton
          variant="secondary"
          className="flex min-h-11 w-full items-center justify-center px-6 text-xs tracking-widest uppercase transition-transform hover:scale-[1.02] md:w-auto">
          + NEW GLOSSARY DRAFT
        </TechButton>
      </Link>
    </div>
  )
}
