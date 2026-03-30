import ReactMarkdown from "react-markdown"
import "katex/dist/katex.min.css"
import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import matter from "gray-matter"
import {
  calculateReadingMetrics,
  generateDescription,
  getMarkdownComponents,
  getPluginsForContent,
} from "@/lib/markdown"
import { getCachedRehypeShiki } from "@/lib/rehype-shiki"
import { getArticleContent } from "@/lib/article-loader"
import {
  resolveSlugWithIndicator,
  getSlugForFilePath,
  resolveSlug,
} from "@/lib/slug-resolver"

interface ArticlePageProps {
  params: Promise<{
    slug?: string[]
  }>
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const slugPath = (slug ?? []).map(decodeURIComponent).join("/") || "preface"
  let filePath = resolveSlug(slugPath)

  if (filePath === null && /\.md$/i.test(slugPath)) {
    filePath = resolveSlug(slugPath.replace(/\.md$/i, ""))
  }

  if (filePath === null) {
    return {
      title: "Article Not Found",
      description: "The requested article could not be found.",
    }
  }

  try {
    const content = await getArticleContent(filePath)
    if (content === null) {
      return {
        title: "Article Not Found",
        description: "The requested article could not be found.",
      }
    }

    const { data } = matter(content)
    const title = data.title || slugPath.split("/").pop() || "Article"
    const description = generateDescription(content)

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
      },
    }
  } catch {
    return {
      title: "Article Not Found",
      description: "The requested article could not be found.",
    }
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params

  const slugPath = (slug ?? []).map(decodeURIComponent).join("/") || "preface"
  let result = resolveSlugWithIndicator(slugPath)

  if (result.filePath === null && /\.md$/i.test(slugPath)) {
    result = resolveSlugWithIndicator(slugPath.replace(/\.md$/i, ""))
  }

  if (result.filePath === null) {
    notFound()
  }

  if (result.isRawPath) {
    const targetSlug = getSlugForFilePath(result.filePath)
    if (targetSlug) {
      redirect(`/articles/${targetSlug}`)
    }
  }

  const content = await getArticleContent(result.filePath)

  if (content === null) {
    notFound()
  }

  const renderedContent = matter(content).content

  const editPath = normalizeDraftTargetPath(result.filePath)

  const { wordCount, readingTime } = calculateReadingMetrics(content)
  const shikiPlugin = await getCachedRehypeShiki(content)
  const { remarkPlugins, rehypePlugins } = getPluginsForContent(
    content,
    shikiPlugin
  )
  const markdownComponents = getMarkdownComponents(result.filePath)

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
          PATH: {result.filePath}
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
        <Link href={`/draft/new?file=${encodeURIComponent(editPath)}`}>
          <button
            type="button"
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
          {renderedContent}
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
