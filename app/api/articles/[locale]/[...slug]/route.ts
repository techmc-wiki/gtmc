import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { getArticleContentBySlug } from "@/lib/articles/content"
import {
  resolveArticleLocale,
  resolveArticleRequest,
} from "@/lib/articles/article-request"
import {
  embedTitleInMarkdown,
  formatArticleDisplayTitle,
} from "@/lib/articles/article-title"
import { decodeSlugPath, encodeSlug } from "@/lib/articles/slug-resolver"

const MARKDOWN_CACHE_CONTROL =
  "public, max-age=300, stale-while-revalidate=86400"

interface ArticleMarkdownRouteContext {
  params: Promise<{ locale: string; slug: string[] }>
}

/**
 * Serves the raw markdown of an article page. Reached through the proxy's
 * content negotiation: requests for /{locale}/articles/** with
 * `Accept: text/markdown` are rewritten here, so the public article URL
 * returns HTML to browsers and raw markdown to agents and the copy-page
 * button.
 */
export async function GET(
  request: NextRequest,
  context: ArticleMarkdownRouteContext
): Promise<NextResponse> {
  const { locale: rawLocale, slug } = await context.params
  const locale = resolveArticleLocale(rawLocale)
  const slugPath = decodeSlugPath(slug) || "preface"
  const resolvedRequest = await resolveArticleRequest(slugPath, locale)

  if (resolvedRequest === null) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    })
  }

  const { contentLocale, target } = resolvedRequest

  // Mirror the page's folder-URL redirect so negotiation re-runs against the
  // canonical article path.
  if (target.redirectToSlug) {
    const redirectUrl = new URL(
      `/${locale}/articles/${encodeSlug(target.redirectToSlug)}`,
      request.url
    )
    return NextResponse.redirect(redirectUrl, 307)
  }

  const artifact = await getArticleContentBySlug(
    target.canonicalSlug ?? slugPath,
    contentLocale
  )

  if (!artifact) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    })
  }

  const articleTitle = await formatArticleDisplayTitle({
    frontmatterTitle: artifact.frontmatter["chapter-title"],
    filePath: target.filePath,
    canonicalSlug: target.canonicalSlug,
    index: target.index,
    isPreface: target.isPreface,
    isReadmeIntro: target.isReadmeIntro,
    locale: contentLocale,
  })

  const markdown = embedTitleInMarkdown(artifact.content, articleTitle)

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": MARKDOWN_CACHE_CONTROL,
    },
  })
}
