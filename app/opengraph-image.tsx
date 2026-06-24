import { ImageResponse } from "next/og"

if (
  process.env.NODE_ENV === "production" &&
  !process.env.CI &&
  !process.env.VERCEL
) {
  process.env.VERCEL = "0"
}

export const runtime = "edge"
export const alt = "Graduate Texts in Minecraft"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const CONTAINER_STYLE = {
  background: "#20283c",
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  borderTop: "16px solid #5fb0d4",
} as const

const TITLE_STYLE = {
  fontSize: 64,
  fontWeight: 700,
  color: "#f5f4ef",
  textAlign: "center",
  lineHeight: 1.2,
} as const

const SUBTITLE_STYLE = {
  fontSize: 28,
  color: "#9aa7bd",
  textAlign: "center",
} as const

export default function Image() {
  return new ImageResponse(
    <div style={CONTAINER_STYLE}>
      <svg
        width="96"
        height="96"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M40.751 20H20V80H24.6738L21.9951 90H10V10H43.4307L40.751 20ZM43.6289 90H34.9355L37.6152 80H46.3076L43.6289 90ZM90 90H56.5693L59.249 80H80V20H75.3262L78.0049 10H90V90ZM62.3848 20H53.6924L56.3711 10H65.0645L62.3848 20Z"
          fill="#e7ecf4"
        />
        <path
          d="M75.3262 20L59.249 80H46.3086L62.3848 20H75.3262ZM53.6914 20L37.6143 80H24.6748L40.751 20H53.6914Z"
          fill="#5fb0d4"
        />
      </svg>
      <div style={TITLE_STYLE}>Graduate Texts in Minecraft</div>
      <div style={SUBTITLE_STYLE}>
        A collaborative textbook for Technical Minecraft
      </div>
    </div>,
    { ...size }
  )
}
