import type { Metadata, Viewport } from "next"
import { cacheLife } from "next/cache"
import {
  Geist,
  Geist_Mono,
  Noto_Sans_SC,
  Noto_Serif_SC,
  STIX_Two_Text,
} from "next/font/google"
// oxlint-disable-next-line import/no-unassigned-import
import "../globals.css"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ThemeProvider } from "@/lib/theme"
import { FooterProvider } from "@/components/layout/footer-context"
import Footer from "@/components/layout/footer"
import { FooterWrapper } from "@/components/layout/footer-wrapper"
import { ScrollRoot } from "@/components/layout/scroll-root"
import { getSiteUrl } from "@/lib/site-url"
import { NextIntlClientProvider } from "next-intl"
import { hasLocale } from "next-intl"
import { setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import { routing } from "@/i18n/routing"

import React from "react"

const siteUrl = getSiteUrl()

type AppLocale = (typeof routing.locales)[number]

async function getCachedMessages(locale: AppLocale) {
  "use cache"
  cacheLife("days")

  switch (locale) {
    case "en":
      return (await import("@/messages/en.json")).default
    case "zh":
      return (await import("@/messages/zh.json")).default
  }
}

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
  adjustFontFallback: false,
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
  adjustFontFallback: false,
})

const notoSansSc = Noto_Sans_SC({
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  variable: "--font-noto-sans-sc",
  adjustFontFallback: false,
})

const stixTwoText = STIX_Two_Text({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-stix-two-text",
  adjustFontFallback: false,
})

const notoSerifSc = Noto_Serif_SC({
  weight: ["400", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-noto-serif-sc",
  adjustFontFallback: false,
})

const jsonLd = {
  __html: JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Graduate Texts in Minecraft",
      url: siteUrl,
      logo: `${siteUrl}/opengraph-image`,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Graduate Texts in Minecraft",
      url: siteUrl,
      description:
        "Graduate Texts in Technical Minecraft - collaboratively written comprehensive textbook for technical Minecraft.",
      inLanguage: ["zh", "en"],
    },
  ]),
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const canonical = `/${locale}`

  return {
    metadataBase: new URL(siteUrl),
    title: "Graduate Texts in Minecraft",
    description:
      "Graduate Texts in Technical Minecraft - collaboratively written comprehensive textbook for technical Minecraft.",
    verification: {
      google: "QE8InawtRuO1F7YrvI1JN56__AFPCAFo6Gn-Vi1QJI8",
    },
    alternates: {
      canonical,
      languages: {
        zh: "/zh",
        en: "/en",
        "x-default": "/zh",
      },
    },
    openGraph: {
      type: "website",
      siteName: "Graduate Texts in Minecraft",
      url: canonical,
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
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#101826" },
  ],
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  const unstable_setRequestLocale = setRequestLocale
  unstable_setRequestLocale(locale)

  const messages = await getCachedMessages(locale)

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansSc.variable} ${stixTwoText.variable} ${notoSerifSc.variable} scroll-smooth`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning>
      <head />
      <Analytics />
      <SpeedInsights />
      <body className="bg-tech-bg/50 h-dvh w-full overflow-hidden antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <FooterProvider>
              <ScrollRoot>
                {children}
                <FooterWrapper>
                  <Footer />
                </FooterWrapper>
              </ScrollRoot>
            </FooterProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd} />
      </body>
    </html>
  )
}
