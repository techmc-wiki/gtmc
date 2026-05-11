import path from "path"
import { ImageResponse } from "next/og"
import { type NextRequest } from "next/server"
import matter from "gray-matter"
import mime from "mime-types"
import { resolveSlug } from "@/lib/slug-resolver"
import {
  getArticleContent,
  getArticleBuffer,
  getLocalizedArticleEntry,
} from "@/lib/article-loader"
import { calculateReadingMetrics } from "@/lib/markdown"
import { getSiteUrl } from "@/lib/site-url"

export const runtime = "nodejs"

const OG_CACHE_CONTROL =
  "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"

const W = 1200
const H = 630
const BANNER_H = Math.round(H * 0.4)
const CARD_H = H - BANNER_H
const META_BAR_H = 36
const BOTTOM_BAR_H = 24

function extractBodyHook(raw: string): string {
  const stripped = raw
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+.+$/gm, "")
    .replace(/[*_`~]/g, "")
    .trim()

  const firstPara = stripped
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .find((p) => p.length > 20)

  if (!firstPara) return ""
  return firstPara.length > 120 ? firstPara.slice(0, 120) + "…" : firstPara
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  const slugPath = slug.map((s) => decodeURIComponent(s)).join("/")

  const filePath = resolveSlug(slugPath)
  if (!filePath) return new Response("Not Found", { status: 404 })

  const content = await getArticleContent(filePath)
  if (!content) return new Response("Not Found", { status: 404 })

  const { data } = matter(content)
  const siteUrl = getSiteUrl()

  const rawTitle =
    (data.title as string | undefined) ??
    content.match(/^#\s+(.+)$/m)?.[1]?.trim() ??
    slug[slug.length - 1]?.replace(/-/g, " ") ??
    "Untitled"
  const title = rawTitle.length > 60 ? rawTitle.slice(0, 60) + "…" : rawTitle

  const manifestEntry = getLocalizedArticleEntry(slugPath, "en")
  const parentEntry = manifestEntry?.parentSlug
    ? getLocalizedArticleEntry(manifestEntry.parentSlug, "en")
    : null
  const chapterTitle =
    manifestEntry?.chapterTitle.trim() ||
    parentEntry?.chapterTitle.trim() ||
    (data["chapter-title"] as string | undefined) ||
    null

  const author = (data.author as string | undefined) ?? null
  const isAdvanced = data["is-advanced"] === true
  const { readingTime } = calculateReadingMetrics(content)
  const bodyHook = extractBodyHook(content)

  const host = siteUrl.replace(/^https?:\/\//, "")
  const urlLabel = `${host}/articles/${slugPath}`

  let fontData: ArrayBuffer | null = null
  try {
    const res = await fetch(
      new URL("/fonts/space-mono/SpaceMono-Bold.ttf", siteUrl)
    )
    if (res.ok) fontData = await res.arrayBuffer()
  } catch {
    // fall back to system monospace
  }
  const fonts = fontData
    ? [{ name: "SpaceMono", data: fontData, weight: 400 as const, style: "normal" as const }]
    : []

  let bannerDataUri: string | null = null
  const bannerSrc = (data.banner as { src?: string } | undefined)?.src
  if (bannerSrc) {
    try {
      const articleDir = path.dirname(filePath)
      const resolvedBannerPath = path
        .join(articleDir, bannerSrc)
        .replace(/\\/g, "/")
      const buf = await getArticleBuffer(resolvedBannerPath)
      if (buf) {
        const mt = mime.lookup(bannerSrc) || "image/png"
        bannerDataUri = `data:${mt};base64,${Buffer.from(buf).toString("base64")}`
      }
    } catch {
      // gradient fallback
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          fontFamily: fontData ? "SpaceMono" : "monospace",
        }}
      >
        {/* BANNER STRIP */}
        <div
          style={{
            width: W,
            height: BANNER_H,
            display: "flex",
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(155deg, #1a2f52 0%, #0c1c36 55%, #070e1c 100%)",
          }}
        >
          {bannerDataUri && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerDataUri}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
          <div
            style={{
              position: "absolute", inset: 0, display: "flex",
              backgroundImage: "linear-gradient(to right, #60708f 1px, transparent 1px), linear-gradient(to bottom, #60708f 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              opacity: bannerDataUri ? 0.05 : 0.1,
            }}
          />
          <div style={{ position: "absolute", top: 16, left: 16, width: 16, height: 24, borderTop: "1px solid rgba(96,112,143,0.6)", borderLeft: "1px solid rgba(96,112,143,0.6)", display: "flex" }} />
          <div style={{ position: "absolute", top: 16, right: 16, width: 16, height: 24, borderTop: "1px solid rgba(96,112,143,0.6)", borderRight: "1px solid rgba(96,112,143,0.6)", display: "flex" }} />
          <div style={{ position: "absolute", bottom: 16, left: 16, width: 16, height: 24, borderBottom: "1px solid rgba(96,112,143,0.6)", borderLeft: "1px solid rgba(96,112,143,0.6)", display: "flex" }} />
          <div style={{ position: "absolute", bottom: 16, right: 16, width: 16, height: 24, borderBottom: "1px solid rgba(96,112,143,0.6)", borderRight: "1px solid rgba(96,112,143,0.6)", display: "flex" }} />
          <div style={{ position: "absolute", top: 12, left: 40, fontSize: 11, color: "rgba(96,112,143,0.55)", letterSpacing: 2, textTransform: "uppercase", display: "flex" }}>
            IMG.BANNER
          </div>
        </div>

        {/* INFO CARD */}
        <div
          style={{
            width: W,
            height: CARD_H,
            display: "flex",
            flexDirection: "column",
            background: "#f8f9fc",
            borderTop: "3px solid #60708f",
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(to right, #60708f 1px, transparent 1px), linear-gradient(to bottom, #60708f 1px, transparent 1px)", backgroundSize: "28px 28px", opacity: 0.03, display: "flex" }} />
          <div style={{ position: "absolute", top: -3, left: 0, width: 12, height: 12, borderTop: "3px solid #60708f", borderLeft: "3px solid #60708f", display: "flex" }} />
          <div style={{ position: "absolute", top: -3, right: 0, width: 12, height: 12, borderTop: "3px solid #60708f", borderRight: "3px solid #60708f", display: "flex" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: 12, height: 12, borderBottom: "3px solid #60708f", borderLeft: "3px solid #60708f", display: "flex" }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderBottom: "3px solid #60708f", borderRight: "3px solid #60708f", display: "flex" }} />

          {/* META BAR */}
          <div style={{ height: META_BAR_H, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", borderBottom: "1px solid #cbd5e1", flexShrink: 0, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 21, color: "#4a5a78", letterSpacing: 0.5 }}>
              <div style={{ width: 9, height: 9, background: "#4a5a78", display: "flex", flexShrink: 0 }} />
              Graduate Texts in Minecraft
            </div>
            <div style={{ fontSize: 18, color: "#4a5a78", letterSpacing: 0.3, padding: "2px 12px", background: "white", display: "flex" }}>
              techmc.wiki
            </div>
          </div>

          {/* CONTENT AREA */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 28px 0", position: "relative", overflow: "hidden" }}>
            {chapterTitle && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 20, color: "#60708f", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                {chapterTitle}
              </div>
            )}

            <div style={{ fontSize: 64, fontWeight: 400, color: "#1e293b", lineHeight: 1.2, marginBottom: 10, letterSpacing: -0.3, display: "flex" }}>
              {title}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 20, color: "rgba(96, 112, 143, 0.67)", marginBottom: 14, flexShrink: 0 }}>
              {author && <span style={{ display: "flex" }}>by {author}</span>}
              {author && readingTime > 0 && <span style={{ color: "#cbd5e1", display: "flex" }}>|</span>}
              {readingTime > 0 && <span style={{ display: "flex" }}>~{readingTime} min to read</span>}
              {isAdvanced && (
                <>
                  <span style={{ color: "#cbd5e1", display: "flex" }}>|</span>
                  <span style={{ border: "1px solid rgba(76,91,150,0.4)", background: "rgba(76,91,150,0.08)", color: "#4c5b96", padding: "2px 8px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", display: "flex" }}>
                    ADVANCED CONTENT
                  </span>
                </>
              )}
            </div>

            {bodyHook && (
              <div style={{ position: "relative", flex: 1, overflow: "hidden", display: "flex" }}>
                <div style={{ fontSize: 24, fontWeight: 350, color: "#60708f", lineHeight: 1.6, display: "flex" }}>
                  {bodyHook}
                </div>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, background: "linear-gradient(to bottom, rgba(248,249,252,0) 0%, rgba(248,249,252,0.6) 40%, rgba(248,249,252,1) 100%)", display: "flex" }} />
              </div>
            )}
          </div>

          {/* BOTTOM BAR */}
          <div style={{ height: BOTTOM_BAR_H, borderTop: "1px solid #cbd5e1", background: "white", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: "#60708f", letterSpacing: 1, display: "flex" }}>{urlLabel}</span>
            <span style={{ fontSize: 12, color: "#c4d0df", letterSpacing: 0.5, display: "flex" }}>1200 × 630</span>
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
