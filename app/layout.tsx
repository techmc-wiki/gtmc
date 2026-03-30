import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { FooterProvider } from "@/components/layout/footer-context"
import { FooterWrapper } from "@/components/layout/footer-wrapper"
import { AuthSessionProvider } from "@/components/providers/session-provider"
import { getSiteUrl } from "@/lib/site-url"

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Graduate Texts in Minecraft",
  description:
    "Graduate Texts in Technical Minecraft - collaboratively written comprehensive textbook for technical Minecraft.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Graduate Texts in Minecraft",
    url: "/",
    title: "Graduate Texts in Minecraft",
    description:
      "Graduate Texts in Technical Minecraft - collaboratively written comprehensive textbook for technical Minecraft.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Graduate Texts in Minecraft",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Graduate Texts in Minecraft",
    description:
      "Graduate Texts in Technical Minecraft - collaboratively written comprehensive textbook for technical Minecraft.",
    images: ["/opengraph-image"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`
        ${GeistSans.variable}
        ${GeistMono.variable}
        scroll-smooth
      `}
      data-scroll-behavior="smooth">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta
          name="google-site-verification"
          content="QE8InawtRuO1F7YrvI1JN56__AFPCAFo6Gn-Vi1QJI8"
        />
      </head>
      <Analytics />
      <SpeedInsights />
      <body
        className="
          flex min-h-screen w-full flex-col overflow-x-hidden bg-tech-bg/50
          antialiased
        ">
        <AuthSessionProvider>
          <FooterProvider>
            <main className="w-full flex-1">{children}</main>
            <FooterWrapper />
          </FooterProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
