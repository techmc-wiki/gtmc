import type { MetadataRoute } from "next"
import { getSiteUrl, toAbsoluteUrl } from "@/lib/site-url"

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/draft", "/review", "/profile", "/admin", "/login"],
    },
    host: siteUrl,
    sitemap: toAbsoluteUrl("/sitemap.xml"),
  }
}
