import { ImageResponse } from "next/og"

if (process.env.NODE_ENV === "production" && !process.env.CI && !process.env.VERCEL) {
  process.env.VERCEL = "0"
}

export const runtime = "edge"
export const alt = "Graduate Texts in Minecraft"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const CONTAINER_STYLE = {
  background: "#0f172a",
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
} as const

const TITLE_STYLE = {
  fontSize: 64,
  fontWeight: 700,
  color: "#f8fafc",
  textAlign: "center",
  lineHeight: 1.2,
} as const

const SUBTITLE_STYLE = {
  fontSize: 28,
  color: "#94a3b8",
  textAlign: "center",
} as const

export default function Image() {
  return new ImageResponse(
    <div style={CONTAINER_STYLE}>
      <div style={TITLE_STYLE}>Graduate Texts in Minecraft</div>
      <div style={SUBTITLE_STYLE}>
        A collaborative textbook for Technical Minecraft
      </div>
    </div>,
    { ...size }
  )
}
