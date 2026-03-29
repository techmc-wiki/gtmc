import type { NextConfig } from "next"
import withBundleAnalyzer from "@next/bundle-analyzer"

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
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

export default config
