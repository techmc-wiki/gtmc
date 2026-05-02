import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "../globals.css"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { FooterProvider } from "@/components/layout/footer-context"
import { FooterWrapper } from "@/components/layout/footer-wrapper"
import { getSiteUrl } from "@/lib/site-url"
import { NextIntlClientProvider } from "next-intl"
import { hasLocale } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import { routing } from "@/i18n/routing"

const siteUrl = getSiteUrl()

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
      </head>
      <Analytics />
      <SpeedInsights />
      <body
        className="
          flex min-h-screen w-full flex-col overflow-x-hidden bg-tech-bg/50
          antialiased
        ">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <FooterProvider>
            {children}
            <FooterWrapper />
          </FooterProvider>
        </NextIntlClientProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
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
          }}
        />
      </body>
    </html>
  )
}
