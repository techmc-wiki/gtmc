import { createOgImage } from "@/lib/og/image"

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

export default function Image() {
  return createOgImage("Graduate Texts in Minecraft")
}
