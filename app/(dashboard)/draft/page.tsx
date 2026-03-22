import { BrutalCard } from "@/components/ui/brutal-card"
import { BrutalButton } from "@/components/ui/brutal-button"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { deleteDraftAction } from "@/actions/article"
import { getPR } from "@/lib/github-pr"

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

  const allDrafts = await Promise.all(
    allDraftsRaw.map(async (d) => {
      let displayStatus = d.status
      let isClosed = false
      let isMerged = false

      if (d.status === "SUBMITTED" && d.githubPrNum) {
        try {
          const pr = await getPR(d.githubPrNum)
          if (pr.state === "closed") {
            isClosed = true
            isMerged = !!pr.merged
            displayStatus = isMerged ? "MERGED" : "CLOSED"
          }
        } catch (e) {
          console.error(`Failed to fetch PR #${d.githubPrNum}:`, e)
        }
      }
      return { ...d, displayStatus, isClosed, isMerged }
    })
  )

  const activeDrafts = allDrafts.filter(
    (d) =>
      d.displayStatus !== "APPROVED" &&
      d.displayStatus !== "ARCHIVED" &&
      d.displayStatus !== "MERGED" &&
      d.displayStatus !== "CLOSED"
  )
  const archivedDrafts = allDrafts.filter(
    (d) =>
      d.displayStatus === "APPROVED" ||
      d.displayStatus === "ARCHIVED" ||
      d.displayStatus === "MERGED" ||
      d.displayStatus === "CLOSED"
  )

  const renderDraftCard = (draft: (typeof allDrafts)[0]) => (
    <BrutalCard
      key={draft.id}
      className="
        group relative flex h-auto flex-col justify-between border
        border-tech-main/40 bg-white/80 p-6 backdrop-blur-sm
        sm:h-64
      ">
      {/* Corner brackets */}
      <div
        className="
          absolute top-0 left-0 size-2 -translate-px border-t-2 border-l-2
          border-tech-main/40 opacity-0 transition-opacity
          group-hover:opacity-100
        "></div>
      <div
        className="
          absolute right-0 bottom-0 size-2 translate-px border-r-2 border-b-2
          border-tech-main/40 opacity-0 transition-opacity
          group-hover:opacity-100
        "></div>

      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between gap-2">
          <span
            className={`
              shrink-0 border px-2 py-0.5 font-mono text-xs tracking-wider
              ${
                draft.displayStatus === "DRAFT"
                  ? "border-tech-main/40 bg-tech-main/5 text-tech-main"
                  : draft.displayStatus === "PENDING" ||
                      draft.displayStatus === "SUBMITTED"
                    ? "border-blue-500/40 bg-blue-500/10 text-blue-600"
                    : draft.displayStatus === "REJECTED" ||
                        draft.displayStatus === "CLOSED"
                      ? "border-red-500/40 bg-red-500/10 text-red-600"
                      : draft.displayStatus === "ARCHIVED"
                        ? "border-gray-500/40 bg-gray-500/10 text-gray-600"
                        : "border-green-500/40 bg-green-500/10 text-green-600"
              }
            `}>
            [{draft.displayStatus}]
          </span>
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-xs text-tech-main/50">
              {draft.updatedAt.toLocaleDateString()}
            </span>
            {draft.displayStatus !== "PENDING" &&
              draft.displayStatus !== "APPROVED" &&
              draft.displayStatus !== "SUBMITTED" &&
              draft.displayStatus !== "MERGED" &&
              draft.displayStatus !== "CLOSED" && (
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
        {draft.articleId && (
          <p
            className="
              mt-4 flex items-center font-mono text-xs tracking-widest
              text-tech-main opacity-80
            ">
            <span className="mr-2 inline-block size-1.5 bg-tech-main"></span>{" "}
            MOD_LIVE_DB
          </p>
        )}
      </div>

      <Link
        href={`/draft/${draft.id}`}
        className="
          relative z-10 mt-4
          sm:mt-auto
        ">
        <BrutalButton
          variant="ghost"
          className="
            min-h-11 w-full border border-tech-main/40 bg-white/50 font-mono
            text-xs tracking-widest transition-all
            hover:border-tech-main/60 hover:bg-white/80
          ">
          {draft.displayStatus === "DRAFT" ||
          draft.displayStatus === "REJECTED" ||
          draft.displayStatus === "CLOSED"
            ? "> EDIT_RECORD"
            : "> VIEW_STREAM"}
        </BrutalButton>
      </Link>
    </BrutalCard>
  )

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6">
      <div
        className="
          relative flex flex-col items-start justify-between gap-4 border-b
          border-tech-main/40 pb-6
          md:flex-row md:items-end
        ">
        <div
          className="
            absolute top-0 right-0 size-8 translate-x-px -translate-y-px
            border-t border-r guide-line
          "></div>
        <div
          className="
            mb-0 w-full
            md:w-auto
          ">
          <h1
            className="
              flex items-center gap-2 text-2xl font-bold tracking-tight
              text-tech-main-dark uppercase
              md:text-4xl
            ">
            <span
              className="
                size-3 shrink-0 border border-tech-main/40 bg-tech-main/20
              "></span>
            <span className="wrap-break-word">Ops Center</span>
          </h1>
          <p
            className="
              mt-3 flex items-center gap-2 font-mono text-xs tracking-widest
              text-tech-main/80
              sm:text-sm
            ">
            <span
              className="
                size-1.5 shrink-0 animate-pulse rounded-full bg-tech-main
              "></span>
            <span className="wrap-break-word">
              YOUR DIGITAL WORKSHOP / DRAFTS & REVISIONS
            </span>
          </p>
        </div>

        <Link
          href="/draft/new"
          className="
            w-full
            md:w-auto
          ">
          <BrutalButton
            variant="primary"
            className="
              flex min-h-11 w-full items-center justify-center px-6 text-xs
              tracking-widest uppercase transition-transform
              hover:scale-[1.02]
              md:w-auto
            ">
            + INITIALIZE SUBMISSION
          </BrutalButton>
        </Link>
      </div>

      <div className="space-y-8">
        <div>
          <h2
            className="
              mb-6 border-b guide-line pb-2 text-lg font-bold tracking-widest
              text-tech-main-dark uppercase
              md:text-xl
            ">
            Active Records
          </h2>
          <div
            className="
              grid grid-cols-1 gap-6
              md:grid-cols-2
              lg:grid-cols-3
            ">
            {activeDrafts.length === 0 ? (
              <div
                className="
                  group relative col-span-full border border-dashed
                  border-tech-main/40 bg-white/30 py-16 text-center
                  backdrop-blur-sm
                ">
                <div
                  className="
                    absolute inset-0
                    bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(96,112,143,0.05)_10px,rgba(96,112,143,0.05)_20px)]
                  "></div>
                <h2
                  className="
                    relative z-10 font-mono text-lg tracking-widest
                    text-tech-main/50 uppercase
                  ">
                  NO ACTIVE RECORDS FOUND.
                </h2>
              </div>
            ) : (
              activeDrafts.map(renderDraftCard)
            )}
          </div>
        </div>

        {archivedDrafts.length > 0 && (
          <div>
            <h2
              className="
                mb-6 border-b guide-line pb-2 text-lg font-bold tracking-widest
                text-tech-main-dark uppercase
                md:text-xl
              ">
              Archived / Approved Records
            </h2>
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
