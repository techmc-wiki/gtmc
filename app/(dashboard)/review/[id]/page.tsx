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
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Link from "next/link";
import { BrutalButton } from "@/components/ui/brutal-button";
import { BrutalCard } from "@/components/ui/brutal-card";
import { approveRevisionAction, rejectRevisionAction } from "@/actions/admin";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
            <span className="text-tech-main/50 px-2">{'//'}</span>
            <span className="text-tech-main">TARGET_FILE:</span>
            <span>{revision.filePath || "NEW_ARTICLE"}</span>
          </div>
        </div>

        {revision.status === "PENDING" && (
          <div className="flex gap-4 w-full md:w-auto">
            <form action={rejectRevisionAction}>
              <input type="hidden" name="revisionId" value={revision.id} />
              <BrutalButton type="submit" variant="secondary" className="w-full text-red-600 border-red-600 hover:bg-red-600 hover:text-white">
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
         <h2 className="text-xl font-mono uppercase border-b border-tech-main/50 inline-block mb-4 tracking-widest text-tech-main">CONTENT_PREVIEW</h2>
      </div>

      <div className="bg-tech-main/5 border border-tech-main/30 p-8 mx-auto relative backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-tech-main/50"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-tech-main/50"></div>
        <div className="prose prose-tech max-w-none w-full overflow-hidden break-words text-tech-main-dark selection:bg-tech-main/20 selection:text-tech-main-dark">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
            rehypePlugins={[rehypeRaw, rehypeKatex]}
            components={({
              wtucolor: ({ node, ...props }: any) => <span style={{ color: 'red' }} {...props} />,
              ttcolor: ({ node, ...props }: any) => <span style={{ color: '#ff7300' }} {...props} />,
              ctcolor: ({ node, ...props }: any) => <span style={{ color: '#ffae00' }} {...props} />,
              becolor: ({ node, ...props }: any) => <span style={{ color: 'green' }} {...props} />,
              eucolor: ({ node, ...props }: any) => <span style={{ color: 'blue' }} {...props} />,
              tecolor: ({ node, ...props }: any) => <span style={{ color: 'blueviolet' }} {...props} />,
              atcolor: ({ node, ...props }: any) => <span style={{ color: 'purple' }} {...props} />,
              heightlightnormal: ({ node, ...props }: any) => <span style={{ color: 'chartreuse' }} {...props} />,
              heightlightwarning: ({ node, ...props }: any) => <span style={{ color: 'crimson' }} {...props} />,
              heightlightadvanced: ({ node, ...props }: any) => <span style={{ color: 'darkseagreen' }} {...props} />,
              nc: ({ node, ...props }: any) => <span {...props} />,
              hidden: ({ node, ...props }: any) => <span style={{ display: 'none' }} {...props} />,
              table: ({ node, ...props }: any) => (
                <div className="w-full overflow-x-auto my-6 border border-tech-main/30 bg-white/50 backdrop-blur-sm">
                  <table className="w-full text-left border-collapse font-mono text-sm min-w-[600px]" {...props} />
                </div>
              ),
              thead: ({ node, ...props }: any) => <thead className="bg-tech-main/10 border-b border-tech-main/30" {...props} />,
              th: ({ node, ...props }: any) => <th className="p-3 font-semibold text-tech-main border-r border-tech-main/10 last:border-r-0 whitespace-nowrap" {...props} />,
              td: ({ node, ...props }: any) => <td className="p-3 border-r border-t border-tech-main/10 last:border-r-0" {...props} />,
              h1: ({ node, ...props }: any) => <h1 id={props.id} className="text-3xl lg:text-4xl font-mono uppercase mt-8 mb-6 tracking-[0.1em] border-b border-tech-main/30 pb-4 text-tech-main-dark scroll-m-20 target:animate-target-blink target:border-tech-main" {...props} />,
              h2: ({ node, ...props }: any) => <h2 id={props.id} className="text-2xl font-mono uppercase mt-8 mb-4 tracking-[0.1em] text-tech-main border-b border-tech-main/30 inline-block pr-4 scroll-m-20 target:animate-target-blink target:border-tech-main-dark" {...props} />,
              h3: ({ node, ...props }: any) => <h3 id={props.id} className="text-xl font-mono uppercase mt-6 mb-3 tracking-widest text-tech-main/80 scroll-m-20 target:animate-target-blink" {...props} />,
              p: ({ node, ...props }: any) => <p className="text-base leading-relaxed mb-6 font-mono text-tech-main-dark" {...props} />,
              ul: ({ node, ...props }: any) => <ul className="list-none pl-6 mb-6 space-y-2 font-mono border-l border-tech-main/30" {...props} />,
              ol: ({ node, ...props }: any) => <ol className="list-decimal pl-6 mb-6 space-y-2 font-mono text-tech-main" {...props} />,
              li: ({ node, ...props }: any) => <li className="relative before:content-['>'] before:absolute before:-left-6 before:text-tech-main/50 text-tech-main-dark" {...props} />,
              blockquote: ({ node, ...props }: any) => (
                <blockquote className="border-l-2 border-tech-main bg-tech-main/5 p-4 mb-6 italic font-mono text-tech-main/80" {...props} />
              ),
              code: ({ node, className, children, ref, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || "");
                return match ? (
                  <div className="my-6 border border-tech-main/30 font-mono text-sm max-w-full overflow-hidden bg-[#1e1e1e]">
                    <div className="bg-tech-main/10 text-tech-main px-4 py-1 text-xs font-mono uppercase tracking-widest flex justify-between items-center border-b border-tech-main/30">
                      <span>{match[1]}</span>
                      <span className="opacity-50">{'//'} EXECUTABLE_BLOCK</span>
                    </div>
                    <div className="overflow-x-auto">
                      <SyntaxHighlighter
                        style={vscDarkPlus as any}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                        {...(props as any)}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                ) : (
                  <code className="bg-tech-main/10 px-1 py-0.5 font-mono text-[13px] text-tech-main border border-tech-main/30 rounded-none" {...props}>
                    {children}
                  </code>
                );
              },
            } as any)}
          >
            {revision.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
