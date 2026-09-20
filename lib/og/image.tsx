import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

export const OG_IMAGE_SIZE = { width: 1200, height: 630 }

const fontData = Promise.all([
  readFile(join(process.cwd(), "assets/og/geist-semibold.woff")),
  readFile(join(process.cwd(), "assets/og/stix-two-text-semibold.woff")),
])

export async function createOgImage(title: string, headers?: HeadersInit) {
  // CJK glyphs occupy roughly twice the width of Latin characters.
  const characters = [...title.trim()]
  const titleWidth = characters.reduce(
    (width, character) => width + (/[^\u0000-\u024f]/.test(character) ? 2 : 1),
    0
  )
  const hasCjk = /[\p{Script=Han}]/u.test(title)
  const fontSize =
    hasCjk && titleWidth > 20 && titleWidth <= 32
      ? Math.floor(1056 / (titleWidth / 2))
      : titleWidth > 80
        ? 64
        : titleWidth > 36
          ? 80
          : 96
  const displayTitle =
    characters.length > 120
      ? `${characters.slice(0, 119).join("").trimEnd()}…`
      : characters.join("")
  const [geist, stix] = await fontData

  // Satori does not resolve CSS variables; these match GTMC's light theme.
  return new ImageResponse(
    <div
      style={{
        ...OG_IMAGE_SIZE,
        display: "flex",
        flexDirection: "column",
        padding: "64px 72px",
        background: "#f5f4ef",
        color: "#20283c",
        fontFamily: "Geist",
        fontWeight: 600,
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <svg width="52" height="52" viewBox="0 0 100 100">
          <path
            d="M40.75 20H20V80H24.67L22 90H10V10H43.43L40.75 20ZM43.63 90H34.94L37.62 80H46.31L43.63 90ZM90 90H56.57L59.25 80H80V20H75.33L78 10H90V90ZM62.38 20H53.69L56.37 10H65.06L62.38 20Z"
            fill="#20283c"
          />
          <path
            d="M75.33 20L59.25 80H46.31L62.38 20H75.33ZM53.69 20L37.61 80H24.67L40.75 20H53.69Z"
            fill="#1d6a96"
          />
        </svg>
        <div style={{ fontFamily: "STIX", fontSize: 32 }}>GTMC</div>
      </div>
      <div
        style={{
          display: "flex",
          flexGrow: 1,
          alignItems: "center",
          padding: "32px 0",
        }}>
        <div
          style={{
            fontFamily: "STIX",
            fontSize,
            lineHeight: 1.15,
            letterSpacing: -1.5,
            lineClamp: 3,
            wordBreak: "break-word",
          }}>
          {displayTitle}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 22, color: "#4a5468" }}>
        techmc.wiki
      </div>
    </div>,
    {
      ...OG_IMAGE_SIZE,
      fonts: [
        { name: "Geist", data: geist, weight: 600, style: "normal" },
        { name: "STIX", data: stix, weight: 600, style: "normal" },
      ],
      headers,
    }
  )
}
