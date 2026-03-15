import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import Link from "next/link";
import { BrutalButton } from "@/components/ui/brutal-button";
import { approveRevisionAction, rejectRevisionAction } from "@/actions/admin";
import { getMarkdownComponents } from "@/app/(dashboard)/articles/markdown-helpers";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const { id } = await params;
  const revision = await prisma.revision.findUnique({
    where: { id },
    include: {
      author: true,
    },
  });

  if (!revision) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 pb-32">
      <Link href="/review">
        <BrutalButton variant="ghost" size="sm">
          {"<"} BACK_TO_HUB
        </BrutalButton>
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-end border-b border-tech-main/30 pb-8 gap-4 relative">
        <div className="absolute -bottom-[5px] left-0 w-2 h-2 border border-tech-main/50 bg-tech-main/20"></div>
        <div>
          <h1 className="text-3xl lg:text-4xl font-mono uppercase tracking-[0.1em] mb-4 break-words leading-tight text-tech-main-dark">
            {revision.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono bg-tech-main/10 text-tech-main-dark p-3 inline-flex border border-tech-main/30">
            <span className="text-tech-main">AUTHOR:</span>
            <span className="uppercase">{revision.author?.name || "UNKNOWN_USER"}</span>
            <span className="text-tech-main/50 px-2">{"//"}</span>
            <span className="text-tech-main">TARGET_FILE:</span>
            <span>{revision.filePath || "NEW_ARTICLE"}</span>
          </div>
        </div>

        {revision.status === "PENDING" && (
          <div className="flex gap-4 w-full md:w-auto">
            <form action={rejectRevisionAction}>
              <input type="hidden" name="revisionId" value={revision.id} />
              <BrutalButton
                type="submit"
                variant="secondary"
                className="w-full text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
              >
                DENY
              </BrutalButton>
            </form>
            <form action={approveRevisionAction}>
              <input type="hidden" name="revisionId" value={revision.id} />
              <BrutalButton type="submit" variant="primary" className="w-full">
                APPROVE_&_MERGE
              </BrutalButton>
            </form>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-mono uppercase border-b border-tech-main/50 inline-block mb-4 tracking-widest text-tech-main">
          CONTENT_PREVIEW
        </h2>
      </div>

      <div className="bg-tech-main/5 border border-tech-main/30 p-8 mx-auto relative backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-tech-main/50"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-tech-main/50"></div>
        <div className="prose prose-tech max-w-none w-full overflow-hidden break-words text-tech-main-dark selection:bg-tech-main/20 selection:text-tech-main-dark">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
            rehypePlugins={[rehypeRaw, rehypeKatex]}
            components={getMarkdownComponents(revision.filePath || "")}
          >
            {revision.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
