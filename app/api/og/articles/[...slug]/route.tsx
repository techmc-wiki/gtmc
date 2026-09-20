import { type NextRequest } from "next/server"
import { hasArticleLocale } from "@/lib/articles/manifest"
import { getCachedLocalizedArticleEntry } from "@/lib/articles/manifest-cached"
import { createOgImage } from "@/lib/og/image"

const OG_CACHE_CONTROL =
  "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"

async function handleArticleOgRequest(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  let slugPath: string
  try {
    const decoded = slug.map((s) => decodeURIComponent(s))
    if (decoded.some((s) => s.includes(".."))) {
      return new Response("Invalid slug", { status: 400 })
    }
    slugPath = decoded.join("/")
  } catch {
    return new Response("Invalid slug encoding", { status: 400 })
  }
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh"

  if (!hasArticleLocale(slugPath, locale)) {
    return new Response("Not Found", { status: 404 })
  }

  const entry = await getCachedLocalizedArticleEntry(slugPath, locale)
  if (!entry) return new Response("Not Found", { status: 404 })

  const title =
    entry.titleByLocale[locale]?.trim() ||
    entry.introTitle?.trim() ||
    entry.chapterTitle?.trim() ||
    entry.titleByLocale.zh?.trim() ||
    slug.at(-1)?.replaceAll("-", " ") ||
    "GTMC"

  return createOgImage(title, { "Cache-Control": OG_CACHE_CONTROL })
}

export { handleArticleOgRequest as GET }
