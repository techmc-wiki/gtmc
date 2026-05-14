import { NextRequest, NextResponse } from "next/server"
import { getPublicSidebarTree } from "@/lib/articles/public-tree"
import type { ArticleLocale } from "@/lib/article-manifest"

const TREE_CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300"
const VALID_LOCALES: ArticleLocale[] = ["zh", "en"]

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const rawLocale = searchParams.get("locale") ?? "zh"
  const locale = VALID_LOCALES.includes(rawLocale as ArticleLocale)
    ? (rawLocale as ArticleLocale)
    : "zh"

  try {
    const tree = await getPublicSidebarTree(locale)
    return NextResponse.json(tree, {
      headers: {
        "Cache-Control": TREE_CACHE_CONTROL,
      },
    })
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development"
    const message = error instanceof Error ? error.message : "Unknown error"

    if (isDev) {
      console.error('[articles/tree] Failed to load tree for locale="%s":', locale, error)
      return NextResponse.json(
        { error: message, locale },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      )
    }

    return NextResponse.json(
      { error: message, locale },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }
}
