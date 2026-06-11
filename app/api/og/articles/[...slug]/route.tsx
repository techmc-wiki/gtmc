/* oxlint-disable react-perf/jsx-no-new-object-as-prop -- OG image route: renders once via Satori, no React re-render cycle */
import { ImageResponse } from "next/og"
import { type NextRequest } from "next/server"
import mime from "mime-types"
import {
  type ArticleLocale,
  hasArticleLocale,
} from "@/lib/articles/manifest"
import { getCachedLocalizedArticleEntry } from "@/lib/articles/manifest-cached"
import { getArticleContentBySlug } from "@/lib/articles/content"
import {
  readLocalArticleAsset,
  resolveArticleAssetPath,
} from "@/lib/articles/banner-assets"
import { getArticleRemoteBuffer } from "@/lib/articles/remote-assets"
import { calculateReadingMetrics } from "@/lib/markdown/reading-metrics"
import { getSiteUrl } from "@/lib/site-url"

const OG_CACHE_CONTROL =
  "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"

const W = 1200
const H = 630
const BANNER_H = Math.round(H * 0.4)
const CARD_H = H - BANNER_H
const META_BAR_H = 36
const BOTTOM_BAR_H = 24
const GOOGLE_SPACE_MONO_700_CSS =
  "https://fonts.googleapis.com/css2?family=Space+Mono:wght@700&display=swap"
const GOOGLE_FONTS_USER_AGENT =
  "Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko"

let spaceMonoFontDataPromise: Promise<ArrayBuffer | null> | null = null

// ── OG Style Constants ──────────────────────────────────────────────────────

const rootStyle = {
  width: W,
  height: H,
  display: "flex" as const,
  flexDirection: "column" as const,
}

const bannerContainerStyle = {
  width: W,
  height: BANNER_H,
  display: "flex" as const,
  position: "relative" as const,
  overflow: "hidden" as const,
  background: "linear-gradient(155deg, #1a2f52 0%, #0c1c36 55%, #070e1c 100%)",
}

const bannerImgStyle = { position: "absolute" as const, inset: 0, width: "100%", height: "100%", objectFit: "cover" as const }

const bannerGridBaseStyle = {
  position: "absolute" as const, inset: 0, display: "flex" as const,
  backgroundImage: "linear-gradient(to right, #60708f 1px, transparent 1px), linear-gradient(to bottom, #60708f 1px, transparent 1px)",
  backgroundSize: "44px 44px",
}

const cornerTLStyle = { position: "absolute" as const, top: 16, left: 16, width: 16, height: 24, borderTop: "1px solid rgba(96,112,143,0.6)", borderLeft: "1px solid rgba(96,112,143,0.6)", display: "flex" as const }
const cornerTRStyle = { position: "absolute" as const, top: 16, right: 16, width: 16, height: 24, borderTop: "1px solid rgba(96,112,143,0.6)", borderRight: "1px solid rgba(96,112,143,0.6)", display: "flex" as const }
const cornerBLStyle = { position: "absolute" as const, bottom: 16, left: 16, width: 16, height: 24, borderBottom: "1px solid rgba(96,112,143,0.6)", borderLeft: "1px solid rgba(96,112,143,0.6)", display: "flex" as const }
const cornerBRStyle = { position: "absolute" as const, bottom: 16, right: 16, width: 16, height: 24, borderBottom: "1px solid rgba(96,112,143,0.6)", borderRight: "1px solid rgba(96,112,143,0.6)", display: "flex" as const }
const bannerLabelStyle = { position: "absolute" as const, top: 12, left: 40, fontSize: 11, color: "rgba(96,112,143,0.55)", letterSpacing: 2, textTransform: "uppercase" as const, display: "flex" as const }

const cardStyle = {
  width: W,
  height: CARD_H,
  display: "flex" as const,
  flexDirection: "column" as const,
  background: "#f8f9fc",
  borderTop: "3px solid #60708f",
  position: "relative" as const,
}

const cardGridStyle = { position: "absolute" as const, inset: 0, backgroundImage: "linear-gradient(to right, #60708f 1px, transparent 1px), linear-gradient(to bottom, #60708f 1px, transparent 1px)", backgroundSize: "28px 28px", opacity: 0.03, display: "flex" as const }
const cardCornerTLStyle = { position: "absolute" as const, top: -3, left: 0, width: 12, height: 12, borderTop: "3px solid #60708f", borderLeft: "3px solid #60708f", display: "flex" as const }
const cardCornerTRStyle = { position: "absolute" as const, top: -3, right: 0, width: 12, height: 12, borderTop: "3px solid #60708f", borderRight: "3px solid #60708f", display: "flex" as const }
const cardCornerBLStyle = { position: "absolute" as const, bottom: 0, left: 0, width: 12, height: 12, borderBottom: "3px solid #60708f", borderLeft: "3px solid #60708f", display: "flex" as const }
const cardCornerBRStyle = { position: "absolute" as const, bottom: 0, right: 0, width: 12, height: 12, borderBottom: "3px solid #60708f", borderRight: "3px solid #60708f", display: "flex" as const }

const metaBarStyle = { height: META_BAR_H, display: "flex" as const, alignItems: "center" as const, justifyContent: "space-between" as const, padding: "0 28px", borderBottom: "1px solid #cbd5e1", flexShrink: 0, position: "relative" as const }
const metaBarLeftStyle = { display: "flex" as const, alignItems: "center" as const, gap: 9, fontSize: 21, color: "#4a5a78", letterSpacing: 0.5 }
const metaBarDotStyle = { width: 9, height: 9, background: "#4a5a78", display: "flex" as const, flexShrink: 0 }
const metaBarRightStyle = { fontSize: 18, color: "#4a5a78", letterSpacing: 0.3, padding: "2px 12px", background: "white", display: "flex" as const }

const contentAreaStyle = { flex: 1, display: "flex" as const, flexDirection: "column" as const, padding: "16px 28px 0", position: "relative" as const, overflow: "hidden" as const }
const chapterTitleStyle = { display: "flex" as const, alignItems: "center" as const, gap: 7, fontSize: 20, color: "#60708f", letterSpacing: 2, textTransform: "uppercase" as const, marginBottom: 8 }
const titleStyle = { fontSize: 64, fontWeight: 400, color: "#1e293b", lineHeight: 1.2, marginBottom: 10, letterSpacing: -0.3, display: "flex" as const }
const metaLineStyle = { display: "flex" as const, alignItems: "center" as const, gap: 12, fontSize: 20, color: "rgba(96, 112, 143, 0.67)", marginBottom: 14, flexShrink: 0 }
const metaSpanStyle = { display: "flex" as const }
const metaSepStyle = { color: "#cbd5e1", display: "flex" as const }
const advancedBadgeStyle = { border: "1px solid rgba(76,91,150,0.4)", background: "rgba(76,91,150,0.08)", color: "#4c5b96", padding: "2px 8px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" as const, display: "flex" as const }

const bodyHookWrapperStyle = { position: "relative" as const, flex: 1, overflow: "hidden" as const, display: "flex" as const }
const bodyHookTextStyle = { fontSize: 24, fontWeight: 350, color: "#60708f", lineHeight: 1.6, display: "flex" as const }
const bodyHookFadeStyle = { position: "absolute" as const, bottom: 0, left: 0, right: 0, height: 100, background: "linear-gradient(to bottom, rgba(248,249,252,0) 0%, rgba(248,249,252,0.6) 40%, rgba(248,249,252,1) 100%)", display: "flex" as const }

const bottomBarStyle = { height: BOTTOM_BAR_H, borderTop: "1px solid #cbd5e1", background: "white", display: "flex" as const, alignItems: "center" as const, justifyContent: "space-between" as const, padding: "0 28px", flexShrink: 0 }
const bottomBarUrlStyle = { fontSize: 13, color: "#60708f", letterSpacing: 1, display: "flex" as const }
const bottomBarDimStyle = { fontSize: 12, color: "#c4d0df", letterSpacing: 0.5, display: "flex" as const }
const VALID_LOCALES = new Set<ArticleLocale>(["zh", "en"])

function resolveLocale(rawLocale: string | null): ArticleLocale {
  return VALID_LOCALES.has(rawLocale as ArticleLocale)
    ? (rawLocale as ArticleLocale)
    : "zh"
}

function extractBodyHook(raw: string): string {
  const stripped = raw
    .replace(/^---[\s\S]*?---/m, "")
    .replaceAll(/```[\s\S]*?```/g, "")
    .replaceAll(/!\[.*?\]\(.*?\)/g, "")
    .replaceAll(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replaceAll(/^#{1,6}\s+.+$/gm, "")
    .replaceAll(/[*_`~]/g, "")
    .trim()

  const firstPara = stripped
    .split(/\n\s*\n/)
    .map((p) => p.replaceAll(/\s+/g, " ").trim())
    .find((p) => p.length > 20)

  if (!firstPara) return ""
  return firstPara.length > 120 ? firstPara.slice(0, 120) + "…" : firstPara
}

async function getSpaceMonoFontData(): Promise<ArrayBuffer | null> {
  spaceMonoFontDataPromise ??= fetch(GOOGLE_SPACE_MONO_700_CSS, {
    headers: { "User-Agent": GOOGLE_FONTS_USER_AGENT },
  })
    .then(async (cssRes) => {
      if (!cssRes.ok) return null

      const css = await cssRes.text()
      const fontUrl = /src: url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/.exec(
        css
      )?.[1]
      if (!fontUrl) return null

      const fontRes = await fetch(fontUrl, {
        headers: { "User-Agent": GOOGLE_FONTS_USER_AGENT },
      })
      return fontRes.ok ? fontRes.arrayBuffer() : null
    })
    .catch(() => null)

  return spaceMonoFontDataPromise
}

export async function GET(
  _req: NextRequest,
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
  const locale = resolveLocale(_req.nextUrl.searchParams.get("locale"))

  if (!hasArticleLocale(slugPath, locale)) {
    return new Response("Not Found", { status: 404 })
  }

  const artifact = await (async () => {
    try {
      return await getArticleContentBySlug(slugPath, locale)
    } catch {
      return null
    }
  })()
  if (!artifact) return new Response("Not Found", { status: 404 })

  const filePath = artifact.filePath
  const content = artifact.content
  const siteUrl = getSiteUrl()

  const manifestEntry = await getCachedLocalizedArticleEntry(slugPath, locale)
  const parentEntry = manifestEntry?.parentSlug
    ? await getCachedLocalizedArticleEntry(manifestEntry.parentSlug, locale)
    : null

  const rawTitle =
    manifestEntry?.titleByLocale[locale] ??
    manifestEntry?.titleByLocale["zh"] ??
    slug[slug.length - 1]?.replaceAll('-', " ") ??
    "Untitled"
  const title = rawTitle.length > 60 ? rawTitle.slice(0, 60) + "…" : rawTitle

  const chapterTitle =
    manifestEntry?.chapterTitle?.trim() ||
    parentEntry?.chapterTitle?.trim() ||
    null

  const author = manifestEntry?.author ?? null
  const isAdvanced = manifestEntry?.isAdvanced === true
  const { readingTime } = calculateReadingMetrics(content)
  const bodyHook = extractBodyHook(content)

  const host = siteUrl.replace(/^https?:\/\//, "")
  const urlLabel = `${host}/articles/${slugPath}`

  const fontData = await getSpaceMonoFontData()
  const fonts = fontData
    ? [{ name: "SpaceMono", data: fontData, weight: 400 as const, style: "normal" as const }]
    : []

  let bannerDataUri: string | null = null
  const bannerEntry = manifestEntry?.bannerByLocale?.[locale] ?? manifestEntry?.bannerByLocale?.zh
  const bannerSrc = bannerEntry?.src
  if (filePath && bannerSrc) {
    try {
      const resolvedBannerPath = resolveArticleAssetPath(bannerSrc, filePath)
      if (!resolvedBannerPath) throw new Error("Invalid banner path")

      const buf =
        (await readLocalArticleAsset(resolvedBannerPath)) ??
        (await getArticleRemoteBuffer(resolvedBannerPath))
      if (buf) {
        const mt = mime.lookup(bannerSrc) || "image/png"
        bannerDataUri = `data:${mt};base64,${Buffer.from(buf).toString("base64")}`
      }
    } catch {
      // gradient fallback
    }
  }

  const computedRootStyle = {
    ...rootStyle,
    fontFamily: fontData ? "SpaceMono" : "monospace",
  }
  const computedGridStyle = {
    ...bannerGridBaseStyle,
    opacity: bannerDataUri ? 0.05 : 0.1,
  }

  return new ImageResponse(
    (
      <div style={computedRootStyle}>
        {/* BANNER STRIP */}
        <div style={bannerContainerStyle}>
          {bannerDataUri && (
            // oxlint-disable-next-line nextjs/no-img-element
            <img
              src={bannerDataUri}
              alt=""
              style={bannerImgStyle}
            />
          )}
          <div style={computedGridStyle} />
          <div style={cornerTLStyle} />
          <div style={cornerTRStyle} />
          <div style={cornerBLStyle} />
          <div style={cornerBRStyle} />
          <div style={bannerLabelStyle}>
            IMG.BANNER
          </div>
        </div>

        {/* INFO CARD */}
        <div style={cardStyle}>
          <div style={cardGridStyle} />
          <div style={cardCornerTLStyle} />
          <div style={cardCornerTRStyle} />
          <div style={cardCornerBLStyle} />
          <div style={cardCornerBRStyle} />

          {/* META BAR */}
          <div style={metaBarStyle}>
            <div style={metaBarLeftStyle}>
              <div style={metaBarDotStyle} />
              Graduate Texts in Minecraft
            </div>
            <div style={metaBarRightStyle}>
              techmc.wiki
            </div>
          </div>

          {/* CONTENT AREA */}
          <div style={contentAreaStyle}>
            {chapterTitle && (
              <div style={chapterTitleStyle}>
                {chapterTitle}
              </div>
            )}

            <div style={titleStyle}>
              {title}
            </div>

            <div style={metaLineStyle}>
              {author && <span style={metaSpanStyle}>by {author}</span>}
              {author && readingTime > 0 && <span style={metaSepStyle}>|</span>}
              {readingTime > 0 && <span style={metaSpanStyle}>~{readingTime} min to read</span>}
              {isAdvanced && (
                <>
                  <span style={metaSepStyle}>|</span>
                  <span style={advancedBadgeStyle}>
                    ADVANCED CONTENT
                  </span>
                </>
              )}
            </div>

            {bodyHook && (
              <div style={bodyHookWrapperStyle}>
                <div style={bodyHookTextStyle}>
                  {bodyHook}
                </div>
                <div style={bodyHookFadeStyle} />
              </div>
            )}
          </div>

          {/* BOTTOM BAR */}
          <div style={bottomBarStyle}>
            <span style={bottomBarUrlStyle}>{urlLabel}</span>
            <span style={bottomBarDimStyle}>1200 × 630</span>
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts,
      headers: { "Cache-Control": OG_CACHE_CONTROL },
    }
  )
}
