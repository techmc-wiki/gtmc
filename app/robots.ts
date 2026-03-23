import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/draft/", "/review/", "/profile", "/admin", "/login"],
    },
    sitemap: "https://beta.techmc.wiki/sitemap.xml",
  }
}
