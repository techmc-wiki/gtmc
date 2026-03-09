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

  const activeDrafts = allDrafts.filter(d => d.status !== 'APPROVED' && d.status !== 'ARCHIVED');
  const archivedDrafts = allDrafts.filter(d => d.status === 'APPROVED' || d.status === 'ARCHIVED');

  const renderDraftCard = (draft: any) => (
    <BrutalCard key={draft.id} className="flex flex-col h-64 justify-between border border-tech-main/30 bg-white/60 backdrop-blur-sm p-6 relative group">
       {/* 工业风边角 */}
       <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-tech-main -translate-x-[1px] -translate-y-[1px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
       <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-tech-main translate-x-[1px] translate-y-[1px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <span className={`px-2 py-0.5 text-[10px] font-mono tracking-wider border ${
            draft.status === 'DRAFT' ? 'border-tech-main/40 text-tech-main bg-tech-main/5' :
            draft.status === 'PENDING' ? 'border-blue-500/40 text-blue-600 bg-blue-500/10' :
            draft.status === 'REJECTED' ? 'border-red-500/40 text-red-600 bg-red-500/10' :
            draft.status === 'ARCHIVED' ? 'border-gray-500/40 text-gray-600 bg-gray-500/10' :
            'border-green-500/40 text-green-600 bg-green-500/10'
          }`}>
            [{draft.status}]
          </span>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-mono text-tech-main/50">
              {draft.updatedAt.toLocaleDateString()}
            </span>
            {(draft.status !== "PENDING" && draft.status !== "APPROVED") && (
              <form action={async () => {
                "use server";
                await deleteDraftAction(draft.id);
              }}>
                <button type="submit" className="text-[10px] uppercase font-mono text-red-500 hover:text-red-700 hover:underline">
                  [DELETE]
                </button>
              </form>
            )}
          </div>
        </div>
        <h3 className="text-xl font-semibold line-clamp-2 uppercase tracking-tight text-tech-main-dark mt-2 border-l-[3px] border-tech-main/40 pl-3">
          {draft.title || "UNTITLED_DOCUMENT"}
        </h3>
        {draft.articleId && (
          <p className="text-xs font-mono text-tech-main mt-4 flex items-center tracking-widest opacity-80">
            <span className="inline-block w-1.5 h-1.5 bg-tech-main mr-2"></span> MOD_LIVE_DB
          </p>
        )}
      </div>
      
      <Link href={`/draft/${draft.id}`} className="relative z-10 mt-auto">
        <BrutalButton variant="ghost" className="w-full text-xs font-mono tracking-widest h-10 border border-tech-main/20 hover:border-tech-main/50 bg-white/50 hover:bg-white/80 transition-all">
          {draft.status === 'DRAFT' || draft.status === 'REJECTED' ? '> EDIT_RECORD' : '> VIEW_STREAM'}
        </BrutalButton>
      </Link>
    </BrutalCard>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-tech-main/40 pb-6 relative">
        <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-tech-main/20 -translate-y-[1px] translate-x-[1px]"></div>
        <div className="mb-6 md:mb-0">
          <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tight text-tech-main-dark flex items-center">
            <span className="w-4 h-4 bg-tech-main/20 border border-tech-main/50 mr-4"></span>
            Ops Center
          </h1>
          <p className="text-sm font-mono tracking-[0.2em] mt-3 text-tech-main/80 flex items-center">
             <span className="w-2 h-2 rounded-full bg-tech-main mr-2 animate-pulse"></span>
             YOUR DIGITAL WORKSHOP / DRAFTS & REVISIONS
          </p>
        </div>
        
        <Link href="/draft/new">
          <BrutalButton variant="primary" className="uppercase text-sm tracking-[0.1em] px-6 h-12 flex items-center justify-center hover:scale-[1.02] transition-transform">
            + INITIALIZE SUBMISSION
          </BrutalButton>
        </Link>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-tech-main-dark mb-6 border-b border-tech-main/20 pb-2">Active Records</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeDrafts.length === 0 ? (
              <div className="col-span-full py-16 text-center border border-dashed border-tech-main/40 bg-white/30 backdrop-blur-sm relative group">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(96,112,143,0.05)_10px,rgba(96,112,143,0.05)_20px)]"></div>
                <h2 className="text-xl font-mono text-tech-main/50 tracking-widest uppercase relative z-10">NO ACTIVE RECORDS FOUND.</h2>
              </div>
            ) : (
              activeDrafts.map(renderDraftCard)
            )}
          </div>
        </div>

        {archivedDrafts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-widest text-tech-main-dark mb-6 border-b border-tech-main/20 pb-2">Archived / Approved Records</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {archivedDrafts.map(renderDraftCard)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}