import type { NextConfig } from "next"
import withBundleAnalyzer from "@next/bundle-analyzer"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  outputFileTracingIncludes: {
    "/*": ["data/manifest.json"],
  },
  outputFileTracingExcludes: {
    "/api/articles/search": [
      "./articles/**/*.{png,gif,jpg,jpeg,webp,svg,mp4,webm,zip,litematic,nbt,schem,schematic,bmp,ico}",
      "./.git/**",
      "./public/gtmc.pdf",
    ],
    "/api/litematica-assets/[...path]": [
      "./articles/**",
      "./.git/**",
      "./public/gtmc.pdf",
    ],
    "/api/litematica-assets/*": [
      "./articles/**",
      "./.git/**",
      "./public/gtmc.pdf",
    ],
  },
  turbopack: {
    resolveAlias: {
      "../extensions/extensions.json":
        "./lib/schematic-renderer/extensions.json",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
}

const config =
  process.env.ANALYZE === "true"
    ? withBundleAnalyzer({ enabled: true })(nextConfig)
    : nextConfig

export default withNextIntl(config)
