import { BrutalCard } from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function ReviewHubPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return (
      <div className="mx-auto mt-20 max-w-6xl p-8 text-center">
        <h1 className="text-6xl font-black text-red-500 uppercase">ACCESS DENIED</h1>
        <p className="mt-4 text-xl font-bold">ADMIN CLEARANCE REQUIRED.</p>
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
    <div className="mx-auto max-w-6xl space-y-8 px-6">
      <div className="border-tech-main/40 relative border-b pb-6">
        <div className="border-tech-main/20 absolute top-0 right-0 h-8 w-8 translate-x-[1px] -translate-y-[1px] border-t border-r"></div>
        <h1 className="text-tech-main-dark flex items-center text-2xl font-bold tracking-tight uppercase md:text-4xl">
          <span className="bg-tech-main/20 border-tech-main/40 mr-4 h-4 w-4 border"></span>
          REVIEW HUB
        </h1>
        <p className="text-tech-main/80 mt-3 flex items-center font-mono text-xs tracking-widest sm:text-sm">
          <span className="bg-tech-main mr-2 h-2 w-2 animate-pulse rounded-full"></span>
          APPROVE CONTENT. MERGE REBELLION.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {pendingRevisions.length === 0 ? (
          <div className="border-tech-main/40 group relative border border-dashed bg-white/30 py-16 text-center backdrop-blur-sm">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(96,112,143,0.05)_10px,rgba(96,112,143,0.05)_20px)]"></div>
            <h2 className="text-tech-main/50 relative z-10 font-mono text-lg tracking-widest uppercase">
              NO PENDING REVIEWS. SILENCE IN THE COMM.
            </h2>
          </div>
        ) : (
          pendingRevisions.map((rev: (typeof pendingRevisions)[0]) => (
            <BrutalCard
              key={rev.id}
              className="border-tech-main/40 group relative flex flex-col items-start justify-between space-y-4 border bg-white/80 p-6 backdrop-blur-sm md:flex-row md:items-center md:space-y-0"
            >
              <div className="border-tech-main/40 absolute top-0 left-0 h-2 w-2 -translate-x-[1px] -translate-y-[1px] border-t-2 border-l-2 opacity-0 transition-opacity group-hover:opacity-100"></div>
              <div className="border-tech-main/40 absolute right-0 bottom-0 h-2 w-2 translate-x-[1px] translate-y-[1px] border-r-2 border-b-2 opacity-0 transition-opacity group-hover:opacity-100"></div>

              <div className="relative z-10 flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <span className="border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 font-mono text-xs tracking-wider text-blue-600">
                    [PENDING]
                  </span>
                  <span className="text-tech-main/50 font-mono text-xs">
                    {rev.updatedAt.toLocaleString()}
                  </span>
                </div>
                <h3 className="text-tech-main-dark border-tech-main/40 mb-2 border-l-2 pl-3 text-lg font-bold tracking-tight uppercase md:text-xl">
                  {rev.title || "UNTITLED"}
                </h3>
                <p className="text-tech-main/80 mb-3 pl-3 font-mono text-xs">
                  Submitted by:{" "}
                  <span className="text-tech-main-dark font-bold">
                    {rev.author?.name || rev.author?.email || "UNKNOWN"}
                  </span>
                </p>
                {rev.filePath && (
                  <p className="bg-tech-main/5 border-tech-main/20 text-tech-main ml-3 inline-flex items-center border px-2 py-1 font-mono text-xs">
                    <span className="bg-tech-main mr-2 h-1.5 w-1.5"></span> TARGET: {rev.filePath}
                  </p>
                )}
              </div>

              <div className="relative z-10 flex w-full flex-col gap-4 md:w-auto md:flex-row">
                <Link href={`/review/${rev.id}`} className="w-full md:w-auto">
                  <BrutalButton
                    variant="primary"
                    className="flex min-h-[44px] w-full items-center justify-center px-6 text-xs tracking-widest uppercase transition-transform hover:scale-[1.02] md:w-auto"
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
