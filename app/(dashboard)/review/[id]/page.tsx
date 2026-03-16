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
    <div className="mx-auto max-w-6xl space-y-8 p-4 pb-32 md:p-8">
      <Link href="/review">
        <BrutalButton variant="ghost" size="sm">
          {"<"} BACK_TO_HUB
        </BrutalButton>
      </Link>

      <div className="border-tech-main/30 relative flex flex-col items-end justify-between gap-4 border-b pb-8 md:flex-row">
        <div className="border-tech-main/50 bg-tech-main/20 absolute -bottom-[5px] left-0 h-2 w-2 border"></div>
        <div>
          <h1 className="text-tech-main-dark mb-4 font-mono text-3xl leading-tight tracking-[0.1em] break-words uppercase lg:text-4xl">
            {revision.title}
          </h1>
          <div className="bg-tech-main/10 text-tech-main-dark border-tech-main/30 flex inline-flex flex-wrap items-center gap-4 border p-3 font-mono text-xs">
            <span className="text-tech-main">AUTHOR:</span>
            <span className="uppercase">{revision.author?.name || "UNKNOWN_USER"}</span>
            <span className="text-tech-main/50 px-2">{"//"}</span>
            <span className="text-tech-main">TARGET_FILE:</span>
            <span>{revision.filePath || "NEW_ARTICLE"}</span>
          </div>
        </div>

        {revision.status === "PENDING" && (
          <div className="flex w-full gap-4 md:w-auto">
            <form action={rejectRevisionAction}>
              <input type="hidden" name="revisionId" value={revision.id} />
              <BrutalButton
                type="submit"
                variant="secondary"
                className="w-full border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
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
        <h2 className="border-tech-main/50 text-tech-main mb-4 inline-block border-b font-mono text-xl tracking-widest uppercase">
          CONTENT_PREVIEW
        </h2>
      </div>

      <div className="bg-tech-main/5 border-tech-main/30 relative mx-auto border p-8 backdrop-blur-sm">
        <div className="border-tech-main/50 absolute top-0 left-0 h-2 w-2 border-t border-l"></div>
        <div className="border-tech-main/50 absolute right-0 bottom-0 h-2 w-2 border-r border-b"></div>
        <div className="prose prose-tech text-tech-main-dark selection:bg-tech-main/20 selection:text-tech-main-dark w-full max-w-none overflow-hidden break-words">
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
