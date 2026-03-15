import { BrutalCard } from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function ReviewHubPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center mt-20">
        <h1 className="text-6xl font-black text-red-500 uppercase">ACCESS DENIED</h1>
        <p className="text-xl font-bold mt-4">ADMIN CLEARANCE REQUIRED.</p>
        <Link href="/">
          <BrutalButton variant="primary" className="mt-8">
            RETURN TO BASE
          </BrutalButton>
        </Link>
      </div>
    );
  }

  const pendingRevisions = await prisma.revision.findMany({
    where: {
      status: "PENDING",
    },
    include: {
      author: true,
    },
    orderBy: {
      updatedAt: "asc",
    },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-6">
      <div className="border-b border-tech-main/40 pb-6 relative">
        <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-tech-main/20 -translate-y-[1px] translate-x-[1px]"></div>
        <h1 className="text-2xl md:text-4xl font-bold uppercase tracking-tight text-tech-main-dark flex items-center">
          <span className="w-4 h-4 bg-tech-main/20 border border-tech-main/40 mr-4"></span>
          REVIEW HUB
        </h1>
        <p className="text-xs sm:text-sm font-mono tracking-widest mt-3 text-tech-main/80 flex items-center">
          <span className="w-2 h-2 rounded-full bg-tech-main mr-2 animate-pulse"></span>
          APPROVE CONTENT. MERGE REBELLION.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {pendingRevisions.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-tech-main/40 bg-white/30 backdrop-blur-sm relative group">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(96,112,143,0.05)_10px,rgba(96,112,143,0.05)_20px)]"></div>
            <h2 className="text-lg font-mono text-tech-main/50 tracking-widest uppercase relative z-10">
              NO PENDING REVIEWS. SILENCE IN THE COMM.
            </h2>
          </div>
        ) : (
          pendingRevisions.map((rev: (typeof pendingRevisions)[0]) => (
            <BrutalCard
              key={rev.id}
              className="flex flex-col md:flex-row justify-between items-start md:items-center border border-tech-main/40 bg-white/80 backdrop-blur-sm p-6 relative group space-y-4 md:space-y-0"
            >
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-tech-main/40 -translate-x-[1px] -translate-y-[1px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-tech-main/40 translate-x-[1px] translate-y-[1px] opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="flex-1 relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-blue-500/10 text-blue-600 px-2 py-0.5 text-xs font-mono border border-blue-500/40 tracking-wider">
                    [PENDING]
                  </span>
                  <span className="text-xs font-mono text-tech-main/50">
                    {rev.updatedAt.toLocaleString()}
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-bold uppercase tracking-tight mb-2 text-tech-main-dark border-l-2 border-tech-main/40 pl-3">
                  {rev.title || "UNTITLED"}
                </h3>
                <p className="text-tech-main/80 font-mono text-xs mb-3 pl-3">
                  Submitted by:{" "}
                  <span className="text-tech-main-dark font-bold">
                    {rev.author?.name || rev.author?.email || "UNKNOWN"}
                  </span>
                </p>
                {rev.filePath && (
                  <p className="inline-flex items-center px-2 py-1 bg-tech-main/5 border border-tech-main/20 text-xs font-mono text-tech-main ml-3">
                    <span className="w-1.5 h-1.5 bg-tech-main mr-2"></span> TARGET: {rev.filePath}
                  </p>
                )}
              </div>

              <div className="w-full md:w-auto flex flex-col md:flex-row gap-4 relative z-10">
                <Link href={`/review/${rev.id}`} className="w-full md:w-auto">
                  <BrutalButton
                    variant="primary"
                    className="w-full md:w-auto px-6 flex items-center justify-center uppercase text-xs tracking-widest hover:scale-[1.02] transition-transform min-h-[44px]"
                  >
                    REVIEW CONTENT →
                  </BrutalButton>
                </Link>
              </div>
            </BrutalCard>
          ))
        )}
      </div>
    </div>
  );
}
