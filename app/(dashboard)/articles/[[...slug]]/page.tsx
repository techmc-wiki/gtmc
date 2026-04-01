import ReactMarkdown from "react-markdown"
import "katex/dist/katex.min.css"
import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import matter from "gray-matter"
import {
  calculateReadingMetrics,
  generateDescription,
  getMarkdownComponents,
  getPluginsForContent,
} from "@/lib/markdown"
import { getCachedRehypeShiki } from "@/lib/markdown/plugins/rehype-shiki"
import { getArticleContent } from "@/lib/article-loader"
import {
  resolveSlugWithIndicator,
  getSlugForFilePath,
  resolveSlug,
} from "@/lib/slug-resolver"
import { getSiteUrl } from "@/lib/site-url"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { ArticleMetadata } from "@/components/articles/article-metadata"
import { ArticleNavigation } from "@/components/article-navigation"
import {
  flattenArticleTree,
  getArticleNavigation,
} from "@/lib/article-navigation"
import { getSidebarTree } from "@/actions/sidebar"

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
    const title = resolveArticleTitle(data.title, filePath)
    const description = generateDescription(content)

    const siteUrl = getSiteUrl()
    const canonicalSlug = getSlugForFilePath(filePath)
    const canonicalUrl = canonicalSlug
      ? `${siteUrl}/articles/${canonicalSlug.split("/").map(encodeURIComponent).join("/")}`
      : `${siteUrl}/articles/${slugPath}`

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        type: "article",
        url: canonicalUrl,
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

  if (result.isDirectFilePath) {
    const targetSlug = getSlugForFilePath(result.filePath)
    if (targetSlug) {
      redirect(`/articles/${targetSlug}`)
    }
  }

  const content = await getArticleContent(result.filePath)

  if (content === null) {
    notFound()
  }

  const { data, content: renderedContent } = matter(content)
  const articleTitle = resolveArticleTitle(data.title, result.filePath)
  const embeddedArticleContent = embedTitleInMarkdown(
    renderedContent,
    articleTitle
  )

  const editPath = normalizeDraftTargetPath(result.filePath)

  const { wordCount, readingTime } = calculateReadingMetrics(content)
  const shikiPlugin = await getCachedRehypeShiki(content)
  const { remarkPlugins, rehypePlugins } = getPluginsForContent(
    content,
    shikiPlugin
  )
  const markdownComponents = getMarkdownComponents(result.filePath)

  const siteUrl = getSiteUrl()
  const canonicalSlug = getSlugForFilePath(result.filePath)
  const canonicalUrl = canonicalSlug
    ? `${siteUrl}/articles/${canonicalSlug.split("/").map(encodeURIComponent).join("/")}`
    : `${siteUrl}/articles/${slugPath}`

  const author = data.author as string | undefined
  const coAuthors = (data["co-authors"] as string[] | undefined) || []
  const createdAt = data.date as string | undefined
  const lastModified = data.lastmod as string | undefined

  // Get navigation data
  const tree = await getSidebarTree()
  const flattenedArticles = flattenArticleTree(tree)
  const currentSlug = canonicalSlug || slugPath
  const navigation = getArticleNavigation(currentSlug, flattenedArticles)

  return (
    <div
      className="
        relative m-auto min-h-screen border border-tech-main/40 bg-transparent
        p-6 backdrop-blur-sm
        sm:p-8
      ">

      <CornerBrackets size="size-4" />

      {/* Article Header */}
      {author && createdAt && lastModified && (
        <ArticleMetadata
          title={articleTitle}
          author={author}
          coAuthors={coAuthors}
          createdAt={createdAt}
          lastModified={lastModified}
          canonicalUrl={canonicalUrl}
          filePath={result.filePath}
          wordCount={wordCount}
          readingTime={readingTime}
          editPath={editPath}
        />
      )}


      <article
        className="
          w-full max-w-none overflow-hidden wrap-break-word text-slate-800
          selection:bg-tech-main/20 selection:text-slate-900
        ">
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={markdownComponents}>
          {embeddedArticleContent}
        </ReactMarkdown>
      </article>

      {(navigation.prev || navigation.next) && (
        <ArticleNavigation prev={navigation.prev} next={navigation.next} />
      )}
    </div>
  )
}

function normalizeDraftTargetPath(filePath: string) {
  if (filePath === "README.md" || filePath.endsWith("/README.md")) {
    return filePath
  }

  return filePath.replace(/\.md$/, "")
}

function resolveArticleTitle(rawTitle: unknown, fallbackPath: string): string {
  if (typeof rawTitle === "string" && rawTitle.trim()) {
    return rawTitle.trim()
  }

  const fallback =
    fallbackPath.split("/").filter(Boolean).pop()?.replace(/\.md$/i, "") ||
    "Article"

  return fallback
}

function embedTitleInMarkdown(content: string, title: string): string {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const normalizedContent = content.trimStart()
  const sameTitleHeadingPattern = new RegExp(
    `^#\\s+${escapedTitle}\\s*(?:\\r?\\n|$)`
  )

  if (sameTitleHeadingPattern.test(normalizedContent)) {
    return content
  }

  return `# ${title}\n\n${content}`
}
