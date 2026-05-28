import { NextRequest, NextResponse } from "next/server"
import { getPublicChapterNav } from "@/lib/articles/public-tree"
import type { ArticleLocale } from "@/lib/articles/manifest"

const TREE_CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300"
const VALID_LOCALES = new Set<ArticleLocale>(["zh", "en"])

/**
 * Returns the public article tree for the requested `?locale=zh|en`.
 * Invalid or missing locale values intentionally fall back to zh to preserve
 * legacy callers while locale-aware clients should always pass it explicitly.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const rawLocale = searchParams.get("locale") ?? "zh"
  const locale = VALID_LOCALES.has(rawLocale as ArticleLocale)
    ? (rawLocale as ArticleLocale)
    : "zh"

  try {
    const tree = await getPublicChapterNav(locale)
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
