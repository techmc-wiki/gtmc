import { BrutalCard } from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { deleteDraftAction } from "@/actions/article";

export default async function DraftDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const allDrafts = await prisma.revision.findMany({
    where: {
      authorId: session.user.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const activeDrafts = allDrafts.filter(
    (d: (typeof allDrafts)[0]) => d.status !== "APPROVED" && d.status !== "ARCHIVED",
  );
  const archivedDrafts = allDrafts.filter(
    (d: (typeof allDrafts)[0]) => d.status === "APPROVED" || d.status === "ARCHIVED",
  );

  const renderDraftCard = (draft: (typeof allDrafts)[0]) => (
    <BrutalCard
      key={draft.id}
      className="border-tech-main/40 group relative flex h-auto flex-col justify-between border bg-white/80 p-6 backdrop-blur-sm sm:h-64"
    >
      {/* Corner brackets */}
      <div className="border-tech-main/40 absolute top-0 left-0 h-2 w-2 -translate-x-[1px] -translate-y-[1px] border-t-2 border-l-2 opacity-0 transition-opacity group-hover:opacity-100"></div>
      <div className="border-tech-main/40 absolute right-0 bottom-0 h-2 w-2 translate-x-[1px] translate-y-[1px] border-r-2 border-b-2 opacity-0 transition-opacity group-hover:opacity-100"></div>

      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between gap-2">
          <span
            className={`shrink-0 border px-2 py-0.5 font-mono text-xs tracking-wider ${
              draft.status === "DRAFT"
                ? "border-tech-main/40 text-tech-main bg-tech-main/5"
                : draft.status === "PENDING"
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-600"
                  : draft.status === "REJECTED"
                    ? "border-red-500/40 bg-red-500/10 text-red-600"
                    : draft.status === "ARCHIVED"
                      ? "border-gray-500/40 bg-gray-500/10 text-gray-600"
                      : "border-green-500/40 bg-green-500/10 text-green-600"
            }`}
          >
            [{draft.status}]
          </span>
          <div className="flex flex-col items-end gap-1">
            <span className="text-tech-main/50 font-mono text-xs">
              {draft.updatedAt.toLocaleDateString()}
            </span>
            {draft.status !== "PENDING" && draft.status !== "APPROVED" && (
              <form
                action={async () => {
                  "use server";
                  await deleteDraftAction(draft.id);
                }}
              >
                <button
                  type="submit"
                  className="flex min-h-[44px] cursor-pointer items-center font-mono text-xs text-red-500 uppercase hover:text-red-700 hover:underline"
                >
                  [DELETE]
                </button>
              </form>
            )}
          </div>
        </div>
        <h3 className="text-tech-main-dark border-tech-main/40 mt-2 line-clamp-2 border-l-2 pl-3 text-lg font-bold tracking-tight uppercase">
          {draft.title || "UNTITLED_DOCUMENT"}
        </h3>
        {draft.articleId && (
          <p className="text-tech-main mt-4 flex items-center font-mono text-xs tracking-widest opacity-80">
            <span className="bg-tech-main mr-2 inline-block h-1.5 w-1.5"></span> MOD_LIVE_DB
          </p>
        )}
      </div>

      <Link href={`/draft/${draft.id}`} className="relative z-10 mt-4 sm:mt-auto">
        <BrutalButton
          variant="ghost"
          className="border-tech-main/40 hover:border-tech-main/60 min-h-[44px] w-full border bg-white/50 font-mono text-xs tracking-widest transition-all hover:bg-white/80"
        >
          {draft.status === "DRAFT" || draft.status === "REJECTED"
            ? "> EDIT_RECORD"
            : "> VIEW_STREAM"}
        </BrutalButton>
      </Link>
    </BrutalCard>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6">
      <div className="border-tech-main/40 relative flex flex-col items-start justify-between gap-4 border-b pb-6 md:flex-row md:items-end">
        <div className="border-tech-main/20 absolute top-0 right-0 h-8 w-8 translate-x-[1px] -translate-y-[1px] border-t border-r"></div>
        <div className="mb-0 w-full md:w-auto">
          <h1 className="text-tech-main-dark flex items-center gap-2 text-2xl font-bold tracking-tight uppercase md:text-4xl">
            <span className="bg-tech-main/20 border-tech-main/40 h-3 w-3 shrink-0 border"></span>
            <span className="break-words">Ops Center</span>
          </h1>
          <p className="text-tech-main/80 mt-3 flex items-center gap-2 font-mono text-xs tracking-widest sm:text-sm">
            <span className="bg-tech-main h-1.5 w-1.5 shrink-0 animate-pulse rounded-full"></span>
            <span className="break-words">YOUR DIGITAL WORKSHOP / DRAFTS & REVISIONS</span>
          </p>
        </div>

        <Link href="/draft/new" className="w-full md:w-auto">
          <BrutalButton
            variant="primary"
            className="flex min-h-[44px] w-full items-center justify-center px-6 text-xs tracking-widest uppercase transition-transform hover:scale-[1.02] md:w-auto"
          >
            + INITIALIZE SUBMISSION
          </BrutalButton>
        </Link>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-tech-main-dark border-tech-main/20 mb-6 border-b pb-2 text-lg font-bold tracking-widest uppercase md:text-xl">
            Active Records
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeDrafts.length === 0 ? (
              <div className="border-tech-main/40 group relative col-span-full border border-dashed bg-white/30 py-16 text-center backdrop-blur-sm">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(96,112,143,0.05)_10px,rgba(96,112,143,0.05)_20px)]"></div>
                <h2 className="text-tech-main/50 relative z-10 font-mono text-lg tracking-widest uppercase">
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
            <h2 className="text-tech-main-dark border-tech-main/20 mb-6 border-b pb-2 text-lg font-bold tracking-widest uppercase md:text-xl">
              Archived / Approved Records
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {archivedDrafts.map(renderDraftCard)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
