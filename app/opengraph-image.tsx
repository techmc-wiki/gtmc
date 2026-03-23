import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Graduate Texts in Minecraft"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#0f172a",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}>
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: "#f8fafc",
          textAlign: "center",
          lineHeight: 1.2,
        }}>
        Graduate Texts in Minecraft
      </div>
      <div
        style={{
          fontSize: 28,
          color: "#94a3b8",
          textAlign: "center",
        }}>
        A collaborative textbook for Technical Minecraft
      </div>
    </div>,
    { ...size }
  )
}
