import type { NextConfig } from "next"
import type * as ChildProcess from "child_process"
import withBundleAnalyzer from "@next/bundle-analyzer"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

const buildSha: string = (() => {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require("child_process") as typeof ChildProcess
    return execSync("git rev-parse --short=7 HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim()
  } catch {
    return "unknown"
  }
})()

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_SHA: buildSha },
  serverExternalPackages: ["@prisma/client", "prisma"],
  outputFileTracingIncludes: {
    "/*": ["data/manifest.json"],
    "/[locale]/articles/[[...slug]]": ["data/articles/**"],
    "/api/og/articles/[...slug]": ["articles/**"],
    "/[locale]/glossary": ["data/glossary*.json"],
    "/[locale]/glossary/[slug]": ["data/glossary*.json"],
  },
  outputFileTracingExcludes: {
    "/api/articles/search": [
      "./articles/**/*.{png,gif,jpg,jpeg,webp,svg,mp4,webm,zip,litematic,nbt,schem,schematic,bmp,ico}",
      "./.git/**",
      "./public/gtmc-*.pdf",
    ],
    "/api/litematica-assets/[...path]": [
      "./articles/**",
      "./.git/**",
      "./public/gtmc-*.pdf",
    ],
    "/api/litematica-assets/*": [
      "./articles/**",
      "./.git/**",
      "./public/gtmc-*.pdf",
    ],
    "/[locale]/glossary/**": ["./glossary/**"],
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
