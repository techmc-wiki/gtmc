import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { notFound } from "next/navigation";
import { BrutalCard } from "@/components/ui/brutal-card";
import Link from "next/link";

interface ArticlePageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  
  let filePathArray = slug || ["README.md"];
  
  // Try to find the correct file
  let rawPath = filePathArray.map(decodeURIComponent).join("/");
  
  // if no extension and no explicit file found, maybe it's a directory?
  // We'll just construct the path and check.
  let fullPath = path.join(process.cwd(), "assets", rawPath);

  if (!fs.existsSync(fullPath)) {
    // try exact match with .md
    if (fs.existsSync(fullPath + ".md")) {
      fullPath += ".md";
    } else {
      // try to check if it's a folder, then look for README.md
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const readmePath = path.join(fullPath, "README.md");
          if (fs.existsSync(readmePath)) {
            fullPath = readmePath;
            rawPath = path.join(rawPath, "README.md");
          }
        }
      } catch (e) {
        // file doesn't exist at all
      }
    }
  }

  let content = "";
  try {
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) {
       if (stat.isDirectory()) {
         const readmePath = path.join(fullPath, "README.md");
         if (fs.existsSync(readmePath)) {
            content = fs.readFileSync(readmePath, "utf-8");
         } else {
            notFound();
         }
       } else {
         notFound();
       }
    } else {
       content = fs.readFileSync(fullPath, "utf-8");
    }
  } catch (error) {
    // Since we handle both docs and 404
    if (rawPath.includes("404")) {
      content = "# 404 Not Found\n\nThe requested article is not available yet.";
    } else {
      notFound();
    }
  }

  // Also replace relative links within the markdown file to point to correct Next.js routes
  const relativeLinkPrefix = "/articles";

  // Calculate the path relative to assets for editing
  let editPath = path.relative(path.join(process.cwd(), "assets"), fullPath).replace(/\\/g, "/");

  return (
    <div className="p-4 md:p-8 pb-32 min-h-screen bg-transparent relative border border-tech-main/30 backdrop-blur-sm">
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-tech-main/50"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-tech-main/50"></div>
      <div className="absolute top-4 right-4 md:top-8 md:right-8">
        <Link href={`/draft/new?file=${encodeURIComponent(editPath)}`}>
          <button className="flex items-center gap-2 border border-tech-main/50 bg-tech-main/10 hover:bg-tech-main/20 text-tech-main px-3 py-1.5 md:px-4 md:py-2 font-mono text-[10px] md:text-xs uppercase tracking-widest transition-all">
            <span>[EDIT_TARGET]</span>
          </button>
        </Link>
      </div>
      <div className="prose prose-tech max-w-none w-full overflow-hidden break-words text-tech-main-dark selection:bg-tech-main/20 selection:text-tech-main-dark">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
          rehypePlugins={[rehypeRaw, rehypeKatex]}
          components={{
            table: ({ node, ...props }) => (
              <div className="w-full overflow-x-auto my-6 border border-tech-main/30 bg-white/50 backdrop-blur-sm">
                <table className="w-full text-left border-collapse font-mono text-sm min-w-[600px]" {...props} />
              </div>
            ),
            thead: ({ node, ...props }) => <thead className="bg-tech-main/10 border-b border-tech-main/30" {...props} />,
            th: ({ node, ...props }) => <th className="p-3 font-semibold text-tech-main border-r border-tech-main/10 last:border-r-0 whitespace-nowrap" {...props} />,
            td: ({ node, ...props }) => <td className="p-3 border-r border-t border-tech-main/10 last:border-r-0" {...props} />,
            h1: ({ node, ...props }) => <h1 className="text-3xl lg:text-4xl font-mono uppercase mt-8 mb-6 tracking-[0.1em] border-b border-tech-main/30 pb-4 text-tech-main-dark" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-2xl font-mono uppercase mt-8 mb-4 tracking-[0.1em] text-tech-main border-b border-tech-main/30 inline-block pr-4" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-xl font-mono uppercase mt-6 mb-3 tracking-widest text-tech-main/80" {...props} />,
            p: ({ node, ...props }) => <p className="text-base leading-relaxed mb-6 font-mono text-tech-main-dark" {...props} />,
            a: ({ node, ...props }) => {
              let href = props.href || "";
              if (href.startsWith("./") || href.startsWith("../")) {
                 const currentDir = path.dirname("/" + rawPath).replace(/^\/+/, "");
                 try {
                    const resolved = path.join(currentDir, href).replace(/\\/g, "/");
                    href = `/articles/${resolved}`;
                 } catch(e) {}
              } else if (!href.startsWith("http") && !href.startsWith("#") && !href.startsWith("/")) {
                 const currentDir = path.dirname("/" + rawPath).replace(/^\/+/, "");
                 const resolved = path.join(currentDir, href).replace(/\\/g, "/");
                 href = `/articles/${resolved}`;
              }
              return <Link href={href} className="text-tech-main border-b border-tech-main/50 font-mono hover:text-white hover:bg-tech-main/80 transition-colors" {...props} />
            },
            ul: ({ node, ...props }) => <ul className="list-none pl-6 mb-6 space-y-2 font-mono border-l border-tech-main/30" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-6 space-y-2 font-mono text-tech-main" {...props} />,
            li: ({ node, ...props }) => <li className="relative before:content-['>'] before:absolute before:-left-6 before:text-tech-main/50 text-tech-main-dark" {...props} />,
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-2 border-tech-main bg-tech-main/5 p-4 mb-6 italic font-mono text-tech-main/80" {...props} />
            ),
            img: ({ node, ...props }) => {
               let src = (props.src as string) || "";
               if (src.startsWith("./") || src.startsWith("../") || (!src.startsWith("http") && !src.startsWith("/"))) {
                   const currentDir = path.dirname("/" + rawPath).replace(/^\/+/, "");
                   const resolved = path.join(currentDir, src).replace(/\\/g, "/");
                   src = `/api/assets?path=${encodeURIComponent(resolved)}`;
               }
               return <img src={src} alt={props.alt || ""} className="max-w-full h-auto border border-tech-main/30 p-1 bg-tech-main/5 my-8" />
            },
            code: ({ node, className, children, ref, ...props }) => {
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
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
