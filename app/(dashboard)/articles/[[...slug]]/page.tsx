import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import "katex/dist/katex.min.css";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  calculateReadingMetrics,
  getMarkdownComponents,
  getPluginsForContent,
} from "../markdown-helpers";
import { getRepoFileContent } from "@/lib/github-pr";

interface ArticlePageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;

  const filePathArray = slug || ["README.md"];

  let rawPath = filePathArray.map(decodeURIComponent).join("/");

  let content = "";
  let editPath = rawPath;

  const dbArticle = await prisma.article.findUnique({
    where: { slug: rawPath },
  });

  if (dbArticle) {
    if (dbArticle.isFolder) {
      const children = await prisma.article.findMany({
        where: { parentId: dbArticle.id },
      });
      content = `# ${dbArticle.title}\n\n[SYS.DIR_CONTENTS]\n\n`;
      children.forEach((child: typeof dbArticle) => {
        content += `- [${child.title}](/articles/${child.slug})\n`;
      });
    } else {
      content = dbArticle.content;
    }
    editPath = `db:${dbArticle.id}`;
  } else {
    let fullPath = path.join(process.cwd(), "assets", rawPath);

    if (!fs.existsSync(fullPath)) {
      if (fs.existsSync(fullPath + ".md")) {
        fullPath += ".md";
      } else {
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            const readmePath = path.join(fullPath, "README.md");
            if (fs.existsSync(readmePath)) {
              fullPath = readmePath;
              rawPath = path.join(rawPath, "README.md");
            }
          }
        } catch {}
      }
    }

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
      // ONLY re-assign editPath on success!
      editPath = path.relative(path.join(process.cwd(), "assets"), fullPath).replace(/\\/g, "/");
    } catch {
      if (rawPath.includes("404")) {
        content = "# 404 Not Found\n\nThe requested article is not available yet.";
      } else {
        notFound();
      }
    }

    // Fallback: fetch from GitHub when not found locally
    if (!content) {
      const pathsToTry = [rawPath, rawPath + ".md"];
      for (const tryPath of pathsToTry) {
        const githubContent = await getRepoFileContent(tryPath);
        if (githubContent) {
          content = githubContent;
          editPath = tryPath.replace(/\.md$/, "");
          break;
        }
      }
      if (!content) notFound();
    }
  }

  const { wordCount, readingTime } = calculateReadingMetrics(content);
  const { remarkPlugins, rehypePlugins } = getPluginsForContent(content);
  const markdownComponents = getMarkdownComponents(rawPath);

  return (
    <div className="border-tech-main/40 relative min-h-screen border bg-transparent p-6 pb-32 backdrop-blur-sm sm:p-8">
      <div className="border-tech-main/40 absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2"></div>
      <div className="border-tech-main/40 absolute right-0 bottom-0 h-4 w-4 border-r-2 border-b-2"></div>

      {/* Article Header Region - Mobile-first in-flow card */}
      <div className="border-tech-main/20 relative mb-8 flex flex-col gap-4 border bg-white/80 p-4 backdrop-blur-sm sm:p-6">
        {/* Corner markers matching BrutalCard pattern */}
        <div className="border-tech-main/40 pointer-events-none absolute top-0 left-0 h-2 w-2 -translate-x-[1px] -translate-y-[1px] border-t-2 border-l-2"></div>
        <div className="border-tech-main/40 pointer-events-none absolute top-0 right-0 h-2 w-2 translate-x-[1px] -translate-y-[1px] border-t-2 border-r-2"></div>
        <div className="border-tech-main/40 pointer-events-none absolute bottom-0 left-0 h-2 w-2 -translate-x-[1px] translate-y-[1px] border-b-2 border-l-2"></div>
        <div className="border-tech-main/40 pointer-events-none absolute right-0 bottom-0 h-2 w-2 translate-x-[1px] translate-y-[1px] border-r-2 border-b-2"></div>

        {/* Region 1: System/Read Label */}
        <div className="text-tech-main/50 flex items-center font-mono text-xs">
          <span className="bg-tech-main/50 mr-2 h-2 w-2 animate-pulse"></span>
          SYS.READ_STREAM | UTF-8
        </div>

        {/* Region 2: Path Line */}
        <div className="font-mono text-xs break-all text-slate-500">PATH: {rawPath}</div>

        {/* Region 3: Reading Stats Row */}
        <div className="text-tech-main flex flex-col gap-2 font-mono text-xs opacity-80 transition-opacity hover:opacity-100 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1">
            <span className="opacity-50">WORDS:</span>
            <span className="font-bold">{wordCount.toLocaleString()}</span>
          </div>
          <span className="hidden opacity-30 sm:inline">|</span>
          <div className="flex items-center gap-1">
            <span className="opacity-50">EST_TIME:</span>
            <span className="font-bold">{readingTime} MIN</span>
          </div>
        </div>

        {/* Region 4: Edit Action Row */}
        <Link href={`/draft/new?file=${encodeURIComponent(editPath)}`}>
          <button className="border-tech-main/40 bg-tech-main/10 hover:bg-tech-main text-tech-main relative flex min-h-[44px] w-full cursor-pointer items-center gap-2 overflow-hidden border px-4 py-2 font-mono text-xs tracking-widest uppercase transition-all duration-300 hover:text-white sm:w-auto">
            <span className="relative z-10 font-bold">[EDIT_TARGET]</span>
          </button>
        </Link>
      </div>

      <div className="prose prose-tech selection:bg-tech-main/20 w-full max-w-none overflow-hidden wrap-break-word text-slate-800 selection:text-slate-900">
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
