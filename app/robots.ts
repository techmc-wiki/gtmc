import type { MetadataRoute } from "next"
import { routing } from "@/i18n/routing"
import { getSiteUrl, toAbsoluteUrl } from "@/lib/site-url"

const PRIVATE_SEGMENTS = [
  "/draft",
  "/profile",
  "/admin",
  "/login",
  "/glossary/edit",
]

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        ...routing.locales.flatMap((locale) =>
          PRIVATE_SEGMENTS.map((segment) => `/${locale}${segment}`)
        ),
        "/api/",
      ],
    },
    host: siteUrl,
    sitemap: toAbsoluteUrl("/sitemap.xml"),
  }
}
