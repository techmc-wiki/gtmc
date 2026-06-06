import type { Metadata } from "next"
import { Geist, Geist_Mono, Noto_Sans_SC } from "next/font/google"
// oxlint-disable-next-line import/no-unassigned-import
import "../globals.css"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ThemeProvider } from "@/lib/theme"
import { FooterProvider } from "@/components/layout/footer-context"
import Footer from "@/components/layout/footer"
import { FooterWrapper } from "@/components/layout/footer-wrapper"
import { getSiteUrl } from "@/lib/site-url"
import { NextIntlClientProvider } from "next-intl"
import { hasLocale } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import { routing } from "@/i18n/routing"

import React from "react"

const siteUrl = getSiteUrl()

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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Graduate Texts in Minecraft",
  description:
    "Graduate Texts in Technical Minecraft - collaboratively written comprehensive textbook for technical Minecraft.",
  verification: {
    google: "QE8InawtRuO1F7YrvI1JN56__AFPCAFo6Gn-Vi1QJI8",
  },
  alternates: {
    canonical: "/zh",
    languages: {
      zh: "/zh",
      en: "/en",
      "x-default": "/zh",
    },
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

  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansSc.variable} scroll-smooth`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#f8f9fc"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#0e1525"
        />
        <title></title>
      </head>
      <Analytics />
      <SpeedInsights />
      <body className="bg-tech-bg/50 flex min-h-screen w-full flex-col overflow-x-hidden antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <FooterProvider>
              {children}
              <FooterWrapper>
                <Footer />
              </FooterWrapper>
            </FooterProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd} />
      </body>
    </html>
  )
}
