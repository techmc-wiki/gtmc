import type { Metadata } from "next"
import "./globals.css"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import Footer from "@/components/layout/footer"

export const metadata: Metadata = {
  title: "Graduate Texts in MC",
  description:
    "Graduate Texts in Technical Minceraft - colaboratively written comprehensive textbook for technical Minecraft.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <Analytics />
      <SpeedInsights />
      <body
        className="
          flex min-h-screen w-full flex-col overflow-x-hidden bg-tech-bg/50
          antialiased
        ">
        <main className="w-full flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
