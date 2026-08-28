import { ImageResponse } from "next/og"

if (
  process.env.NODE_ENV === "production" &&
  !process.env.CI &&
  !process.env.VERCEL
) {
  process.env.VERCEL = "0"
}

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
          d="M40.75 20H20V80H24.67L22 90H10V10H43.43L40.75 20ZM43.63 90H34.94L37.62 80H46.31L43.63 90ZM90 90H56.57L59.25 80H80V20H75.33L78 10H90V90ZM62.38 20H53.69L56.37 10H65.06L62.38 20Z"
          fill="#e7ecf4"
        />
        <path
          d="M75.33 20L59.25 80H46.31L62.38 20H75.33ZM53.69 20L37.61 80H24.67L40.75 20H53.69Z"
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
