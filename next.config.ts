import type { NextConfig } from "next"
import type * as ChildProcess from "child_process"
import withBundleAnalyzer from "@next/bundle-analyzer"
import createNextIntlPlugin from "next-intl/plugin"
import createMDX from "@next/mdx"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")
const withMDX = createMDX({})
const remoteArticleAssetTraceExcludes = ["./articles/**", "./.git/**"]

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

const appVersion: string = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require("child_process") as typeof ChildProcess
    return execSync("git tag --sort=-version:refname | head -n 1", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim()
  } catch {
    return "unknown"
  }
})()

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_BUILD_SHA: buildSha,
  },
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "gray-matter",
    "papaparse",
  ],
  experimental: {
    cpus: 2,
    useTypeScriptCli: true,
    optimizePackageImports: [
      "motion/react",
      "@codemirror/state",
      "@codemirror/view",
      "@codemirror/language",
      "@codemirror/commands",
      "@codemirror/autocomplete",
      "next-intl",
      "@tanstack/react-virtual",
      "zod",
      "diff",
    ],
  },
  cacheComponents: true,
  redirects() {
    return [
      {
        source: "/qq",
        destination: "https://qm.qq.com/q/OzhZSSm6A4",
        statusCode: 301,
      },
      {
        source: "/gh",
        destination: "https://github.com/techmc-wiki/gtmc",
        statusCode: 301,
      },
    ]
  },
  outputFileTracingIncludes: {
    "/*": ["data/manifest.json"],
    "/\\[locale\\]/articles/\\[\\[\\.\\.\\.slug\\]\\]": ["data/articles/**"],
    "/\\[locale\\]/glossary": ["data/glossary*.json"],
    "/api/glossary": ["data/glossary*.json"],
  },
  outputFileTracingExcludes: {
    "/api/assets/banner/\\[\\.\\.\\.path\\]": remoteArticleAssetTraceExcludes,
    "/api/og/articles/\\[\\.\\.\\.slug\\]": remoteArticleAssetTraceExcludes,
    "/api/articles/search": [
      "./articles/**/*.{png,gif,jpg,jpeg,webp,svg,mp4,webm,zip,litematic,nbt,schem,schematic,bmp,ico}",
      "./.git/**",
    ],
    "/api/litematica-assets/\\[\\.\\.\\.path\\]": [
      "./articles/**",
      "./.git/**",
    ],
    "/\\[locale\\]/glossary/**": ["./glossary/**"],
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

export default withNextIntl(withMDX(config))
