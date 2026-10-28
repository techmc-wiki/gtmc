import path from "node:path"
import type { NextConfig } from "next"
import type * as ChildProcess from "child_process"
import withBundleAnalyzer from "@next/bundle-analyzer"
import createNextIntlPlugin from "next-intl/plugin"
import createMDX from "@next/mdx"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")
const withMDX = createMDX({})
// Trace-exclude globs resolve from the app root (apps/web). The article and
// glossary submodules live under `content/` at the workspace root, so they are
// referenced relative to that.
const remoteArticleAssetTraceExcludes = [
  "../../content/articles/**",
  "../../.git/**",
]

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
  serverExternalPackages: ["gray-matter", "papaparse"],
  experimental: {
    cpus: 2,
    useTypeScriptCli: true,
    optimizePackageImports: [
      "@codemirror/state",
      "@codemirror/view",
      "@codemirror/language",
      "@codemirror/commands",
      "@codemirror/autocomplete",
      "next-intl",
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
  // Trace from the workspace root so files above apps/web (the content/
  // submodules) can be represented in route traces. Keep this aligned with
  // turbopack.root below.
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  outputFileTracingIncludes: {
    "/*": ["data/manifest.json"],
    "/\\[locale\\]/articles/\\[\\[\\.\\.\\.slug\\]\\]": ["data/articles/**"],
    "/\\[locale\\]/glossary": ["data/glossary*.json"],
    "/api/glossary": ["data/glossary*.json"],
    "/api/properties": ["../../content/properties/data/*.json"],
    "/\\[locale\\]/properties": [
      "../../content/properties/data/block_data.json",
    ],
    // The draft editor renders the contribution guides staged by
    // scripts/stage-draft-guides.ts.
    "/\\[locale\\]/draft/\\[id\\]": ["data/contributing/*.md"],
  },
  outputFileTracingExcludes: {
    "/api/assets/banner/\\[\\.\\.\\.path\\]": remoteArticleAssetTraceExcludes,
    "/api/og/articles/\\[\\.\\.\\.slug\\]": remoteArticleAssetTraceExcludes,
    "/api/articles/search": [
      "../../content/articles/**/*.{png,gif,jpg,jpeg,webp,svg,mp4,webm,zip,litematic,nbt,schem,schematic,bmp,ico}",
      "../../.git/**",
    ],
    "/api/litematica-assets/\\[\\.\\.\\.path\\]": [
      "../../content/articles/**",
      "../../.git/**",
    ],
    "/\\[locale\\]/glossary/**": ["../../content/glossary/**"],
  },
  turbopack: {
    // Align with outputFileTracingRoot above; the workspace lockfile and any
    // linked packages live above apps/web.
    root: path.join(__dirname, "..", ".."),
    resolveAlias: {
      // Nucleation's Node <22 fallback imports `fs`, so browser bundles use
      // a stub while server bundles retain the real module.
      fs: {
        browser: "./lib/nucleation/fs-browser-stub.mjs",
      },
      "node:fs": {
        browser: "./lib/nucleation/fs-browser-stub.mjs",
      },
    },
  },
  async headers() {
    return [
      {
        // Chrome HTML-in-Canvas origin trial: enables the CanvasUI
        // DecryptReveal effect on the PDF download page. Token is bound
        // to https://www.techmc.wiki and expires 2026-10-19.
        source: "/:path*",
        headers: [
          {
            key: "Origin-Trial",
            value:
              "AlNE6Dr0We0vv7HNSzPGSc7HI46ID49UvB3aYU/5wKlwPqseeiEaXQQsRsndqjH2/ZQVO+qg2vSyIxk2k7KR/AIAAABoeyJvcmlnaW4iOiJodHRwczovL3d3dy50ZWNobWMud2lraTo0NDMiLCJmZWF0dXJlIjoiSFRNTEluQ2FudmFzIiwiZXhwaXJ5IjoxNzkyNDU0NDAwLCJpc1N1YmRvbWFpbiI6dHJ1ZX0=",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/u/**",
      },
      {
        protocol: "https",
        hostname: "github.com",
        pathname: "/*.png",
      },
      {
        protocol: "https",
        hostname: "i0.hdslb.com",
        pathname: "/bfs/face/**",
      },
      {
        protocol: "https",
        hostname: "i1.hdslb.com",
        pathname: "/bfs/face/**",
      },
      {
        protocol: "https",
        hostname: "i.ibb.co",
        pathname: "/cSY4MKpg/*",
      },
      {
        protocol: "https",
        hostname: "www.xhbsh.top",
        pathname: "/img/**",
      },
      {
        protocol: "https",
        hostname: "zh.minecraft.wiki",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/techmc-wiki/Articles/**",
      },
    ],
  },
}

const config =
  process.env.ANALYZE === "true"
    ? withBundleAnalyzer({ enabled: true })(nextConfig)
    : nextConfig

export default withNextIntl(withMDX(config))
