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
import { getArticleContent, getArticleTree } from "@/lib/article-loader"
import { getSlugMapEntry, resolveSlug } from "@/lib/slug-resolver"
import { getSiteUrl } from "@/lib/site-url"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { ArticleMetadata } from "@/components/articles/article-metadata"
import { ArticleMetadataSimple } from "@/components/articles/article-metadata-simple"
import { ArticleNavigation } from "@/components/article-navigation"
import {
  flattenArticleTree,
  getArticleNavigation,
  getFirstArticleInChapter,
} from "@/lib/article-navigation"
import { getSidebarTree } from "@/actions/sidebar"
import type { ArticleTreeNode as BaseArticleTreeNode } from "@/lib/github/sync"

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
  const target = await resolveArticleTarget(slugPath)

  if (target === null) {
    return {
      title: "Article Not Found",
      description: "The requested article could not be found.",
    }
  }

  try {
    const content = await getArticleContent(target.filePath)
    if (content === null) {
      return {
        title: "Article Not Found",
        description: "The requested article could not be found.",
      }
    }

    const { data } = matter(content)
    const title = resolveDisplayedArticleTitle(
      data["chapter-title"],
      target.filePath,
      target.canonicalSlug
    )
    const description = generateDescription(content)

    const siteUrl = getSiteUrl()
    const canonicalSlug = target.canonicalSlug
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
  const target = await resolveArticleTarget(slugPath)

  if (target === null) {
    notFound()
  }

  if (target.redirectToSlug) {
    const redirectPath = target.redirectToSlug
      .split("/")
      .map(encodeURIComponent)
      .join("/")
    redirect(`/articles/${redirectPath}`)
  }

  const content = await getArticleContent(target.filePath)

  if (content === null) {
    notFound()
  }

  const { data, content: renderedContent } = matter(content)
  const articleTitle = resolveDisplayedArticleTitle(
    data["chapter-title"],
    target.filePath,
    target.canonicalSlug
  )
  const embeddedArticleContent = embedTitleInMarkdown(
    renderedContent,
    articleTitle
  )

  const editPath = normalizeDraftTargetPath(target.filePath)

  const { wordCount, readingTime } = calculateReadingMetrics(content)
  const shikiPlugin = await getCachedRehypeShiki(content)
  const { remarkPlugins, rehypePlugins } = getPluginsForContent(
    content,
    shikiPlugin
  )
  const markdownComponents = getMarkdownComponents(target.filePath)

  const siteUrl = getSiteUrl()
  const canonicalSlug = target.canonicalSlug
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
      {author && createdAt && lastModified ? (
        <ArticleMetadata
          title={articleTitle}
          author={author}
          coAuthors={coAuthors}
          createdAt={createdAt}
          lastModified={lastModified}
          canonicalUrl={canonicalUrl}
          filePath={target.filePath}
          wordCount={wordCount}
          readingTime={readingTime}
          editPath={editPath}
        />
      ) : (
        <ArticleMetadataSimple
          title={articleTitle}
          filePath={target.filePath}
          wordCount={wordCount}
          readingTime={readingTime}
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

type ArticleTreeNode = BaseArticleTreeNode & { index?: number }

interface ResolvedArticleTarget {
  filePath: string
  canonicalSlug: string
  redirectToSlug?: string
}

async function resolveArticleTarget(
  requestedSlugPath: string
): Promise<ResolvedArticleTarget | null> {
  const normalizedSlug = requestedSlugPath.replace(/\.md$/i, "")
  const tree: ArticleTreeNode[] = await getArticleTree()
  const targetNode = findNodeBySlug(tree, normalizedSlug)

  if (!targetNode) {
    return null
  }

  const canonicalSlug = targetNode.isFolder
    ? resolveCanonicalSlugForFolder(targetNode)
    : targetNode.slug

  if (!canonicalSlug) {
    return null
  }

  const filePath = resolveSlug(canonicalSlug)
  if (!filePath) {
    return null
  }

  const redirectToSlug =
    targetNode.isFolder && canonicalSlug !== normalizedSlug
      ? canonicalSlug
      : undefined

  return { filePath, canonicalSlug, redirectToSlug }
}

function resolveCanonicalSlugForFolder(
  targetNode: ArticleTreeNode
): string | null {
  const mapEntry = getSlugMapEntry(targetNode.slug)
  if (mapEntry?.hasIntro) {
    return targetNode.slug
  }

  return resolveFirstArticleSlug(targetNode.children ?? [])
}

function findNodeBySlug(
  nodes: ArticleTreeNode[],
  targetSlug: string
): ArticleTreeNode | null {
  for (const node of nodes) {
    if (node.slug === targetSlug) {
      return node
    }

    const nested = findNodeBySlug(node.children ?? [], targetSlug)
    if (nested) {
      return nested
    }
  }

  return null
}

function resolveFirstArticleSlug(children: ArticleTreeNode[]): string | null {
  if (!children || children.length === 0) {
    return null
  }

  const chapterEntries = children.map((child) => ({
    filePath: resolveSlug(child.slug) ?? `${child.slug}.md`,
    slug: child.slug,
    index: child.index ?? -1,
    isFolder: child.isFolder,
  }))

  const firstEntry = getFirstArticleInChapter(chapterEntries)
  if (!firstEntry) {
    return null
  }

  if (!firstEntry.isFolder) {
    return firstEntry.slug
  }

  const matchedFolder = children.find((child) => child.slug === firstEntry.slug)
  if (!matchedFolder) {
    return null
  }

  return resolveFirstArticleSlug(matchedFolder.children ?? [])
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

function resolveDisplayedArticleTitle(
  rawTitle: unknown,
  fallbackPath: string,
  canonicalSlug: string
): string {
  const slugEntry = getSlugMapEntry(canonicalSlug)
  const introTitle = slugEntry?.introTitle?.trim()

  if (slugEntry?.isFolder && slugEntry.hasIntro && introTitle) {
    return introTitle
  }

  return resolveArticleTitle(rawTitle, fallbackPath)
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
