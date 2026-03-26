import { prisma } from "@/lib/prisma"
import ReactMarkdown from "react-markdown"
import "katex/dist/katex.min.css"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
  calculateReadingMetrics,
  getMarkdownComponents,
  getPluginsForContent,
} from "@/lib/markdown"
import { createRehypeShiki } from "@/lib/rehype-shiki"
import { getRepoFileContent } from "@/lib/github-pr"

interface ArticlePageProps {
  params: Promise<{
    slug?: string[]
  }>
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params

  const filePathArray = slug || ["Preface.md"]

  let rawPath = filePathArray.map(decodeURIComponent).join("/")

  let content = ""
  let editPath = rawPath

  const dbArticle = await prisma.article.findUnique({
    where: { slug: rawPath },
  })

  if (dbArticle) {
    if (dbArticle.isFolder) {
      const children = await prisma.article.findMany({
        where: { parentId: dbArticle.id },
      })
      content = `# ${dbArticle.title}\n\n[SYS.DIR_CONTENTS]\n\n`
      children.forEach((child: typeof dbArticle) => {
        content += `- [${child.title}](/articles/${child.slug.split("/").map(encodeURIComponent).join("/")})\n`
      })
    } else {
      content = dbArticle.content
    }
    editPath = `db:${dbArticle.id}`
  } else {
    const normalizedPath = rawPath.replace(/^\/+/, "")
    const pathsToTry = normalizedPath.endsWith(".md")
      ? [
          normalizedPath,
          normalizedPath.replace(/\.md$/, ""),
          `${normalizedPath.replace(/\.md$/, "")}/README.md`,
        ]
      : [normalizedPath, `${normalizedPath}.md`, `${normalizedPath}/README.md`]

    for (const tryPath of pathsToTry) {
      const githubContent = await getRepoFileContent(tryPath)
      if (githubContent !== null) {
        content = githubContent
        rawPath = tryPath
        editPath = normalizeDraftTargetPath(tryPath)
        break
      }
    }

    if (!content) {
      if (rawPath.includes("404")) {
        content =
          "# 404 Not Found\n\nThe requested article is not available yet."
      } else {
        notFound()
      }
    }
  }

  const { wordCount, readingTime } = calculateReadingMetrics(content)
  const shikiPlugin = await createRehypeShiki()
  const { remarkPlugins, rehypePlugins } = getPluginsForContent(
    content,
    shikiPlugin
  )
  const markdownComponents = getMarkdownComponents(rawPath)

  return (
    <div
      className="
        relative min-h-screen border border-tech-main/40 bg-transparent p-6
        pb-32 backdrop-blur-sm
        sm:p-8
      ">
      <div
        className="
          absolute top-0 left-0 size-4 border-t-2 border-l-2 border-tech-main/40
        "></div>
      <div
        className="
          absolute right-0 bottom-0 size-4 border-r-2 border-b-2
          border-tech-main/40
        "></div>

      {/* Article Header Region - Mobile-first in-flow card */}
      <div
        className="
          relative mb-8 flex flex-col gap-4 border guide-line bg-white/80 p-4
          backdrop-blur-sm
          sm:p-6
        ">
        {/* Corner markers matching BrutalCard pattern */}
        <div
          className="
            pointer-events-none absolute top-0 left-0 size-2 -translate-px
            border-t-2 border-l-2 border-tech-main/40
          "></div>
        <div
          className="
            pointer-events-none absolute top-0 right-0 size-2 translate-x-px
            -translate-y-px border-t-2 border-r-2 border-tech-main/40
          "></div>
        <div
          className="
            pointer-events-none absolute bottom-0 left-0 size-2 -translate-x-px
            translate-y-px border-b-2 border-l-2 border-tech-main/40
          "></div>
        <div
          className="
            pointer-events-none absolute right-0 bottom-0 size-2 translate-px
            border-r-2 border-b-2 border-tech-main/40
          "></div>

        {/* Region 1: System/Read Label */}
        <div className="flex items-center font-mono text-xs text-tech-main/50">
          <span className="mr-2 size-2 animate-pulse bg-tech-main/50"></span>
          SYS.READ_STREAM | UTF-8
        </div>

        {/* Region 2: Path Line */}
        <div className="font-mono text-xs break-all text-slate-500">
          PATH: {rawPath}
        </div>

        {/* Region 3: Reading Stats Row */}
        <div
          className="
            flex flex-col gap-2 font-mono text-xs text-tech-main opacity-80
            transition-opacity
            hover:opacity-100
            sm:flex-row sm:items-center
          ">
          <div className="flex items-center gap-1">
            <span className="opacity-50">WORDS:</span>
            <span className="font-bold">{wordCount.toLocaleString()}</span>
          </div>
          <span
            className="
              hidden opacity-30
              sm:inline
            ">
            |
          </span>
          <div className="flex items-center gap-1">
            <span className="opacity-50">EST_TIME:</span>
            <span className="font-bold">{readingTime} MIN</span>
          </div>
        </div>

        {/* Region 4: Edit Action Row */}
        <Link
          href={
            dbArticle
              ? `/draft/new?articleId=${encodeURIComponent(dbArticle.id)}&file=${encodeURIComponent(rawPath)}`
              : `/draft/new?file=${encodeURIComponent(editPath)}`
          }>
          <button
            className="
              relative flex min-h-[44px] w-full cursor-pointer items-center
              gap-2 overflow-hidden border border-tech-main/40 bg-tech-main/10
              px-4 py-2 font-mono text-xs tracking-widest text-tech-main
              uppercase transition-all duration-300
              hover:bg-tech-main hover:text-white
              sm:w-auto
            ">
            <span className="relative z-10 font-bold">[EDIT_TARGET]</span>
          </button>
        </Link>
      </div>

      <div
        className="
          w-full max-w-none overflow-hidden wrap-break-word text-slate-800
          selection:bg-tech-main/20 selection:text-slate-900
        ">
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}

function normalizeDraftTargetPath(filePath: string) {
  if (filePath === "README.md" || filePath.endsWith("/README.md")) {
    return filePath
  }

  return filePath.replace(/\.md$/, "")
}
