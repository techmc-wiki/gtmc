/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import "katex/dist/katex.min.css";
import { notFound } from "next/navigation";
import { BrutalCard } from "@/components/ui/brutal-card";
import Link from "next/link";
import Image from "next/image";
import {
  calculateReadingMetrics,
  getMarkdownComponents,
  getPluginsForContent,
} from "../markdown-helpers";

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
        } catch (e) {}
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
    } catch (error) {
      if (rawPath.includes("404")) {
        content = "# 404 Not Found\n\nThe requested article is not available yet.";
      } else {
        notFound();
      }
    }
  }

  const relativeLinkPrefix = "/articles";

  const { wordCount, readingTime } = calculateReadingMetrics(content);
  const { remarkPlugins, rehypePlugins } = getPluginsForContent(content);
  const markdownComponents = getMarkdownComponents(rawPath);

  return (
    <div className="p-4 md:p-8 pb-32 min-h-screen bg-transparent relative border border-tech-main/30 backdrop-blur-sm shadow-[0_0_15px_rgba(255,107,0,0.05)]">
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-tech-main/50"></div>
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-tech-main/50"></div>
      <div className="absolute top-4 right-4 md:top-8 md:right-8 group z-20 flex flex-col items-end gap-2">
        <Link href={`/draft/new?file=${encodeURIComponent(editPath)}`}>
          <button className="flex items-center gap-2 border border-tech-main/50 bg-tech-main/10 hover:bg-tech-main text-tech-main hover:text-white px-4 py-2 font-mono text-[10px] md:text-xs uppercase tracking-widest transition-all duration-300 relative overflow-hidden">
            <span className="relative z-10 font-bold">[EDIT_TARGET]</span>
          </button>
        </Link>
        <div className="text-[10px] font-mono text-tech-main flex items-center gap-2 opacity-80 transition-opacity hover:opacity-100">
          <div className="flex items-center gap-1">
            <span className="opacity-50">WORDS:</span>
            <span className="font-bold">{wordCount.toLocaleString()}</span>
          </div>
          <span className="opacity-30">|</span>
          <div className="flex items-center gap-1">
            <span className="opacity-50">EST_TIME:</span>
            <span className="font-bold">{readingTime} MIN</span>
          </div>
        </div>
      </div>

      <div className="mb-12 border-b border-tech-main/20 pb-4 pt-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="md:w-auto w-full">
          <div className="text-[10px] font-mono text-tech-main/50 flex items-center mb-1">
            <span className="w-2 h-2 bg-tech-main/50 mr-2 animate-pulse"></span>
            SYS.READ_STREAM | UTF-8
          </div>
          <div className="text-[10px] font-mono text-slate-500 break-all">PATH: {rawPath}</div>
        </div>
      </div>

      <div className="prose prose-tech max-w-none w-full overflow-hidden wrap-break-word text-slate-800 selection:bg-tech-main/20 selection:text-slate-900">
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
