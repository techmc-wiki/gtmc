const fs = require('fs');
const content = \import type { NextConfig } from "next";

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
  async rewrites() {
    return [
      {
        source: "/cos-assets/:path*",
        destination: \https://\.cos.\.myqcloud.com/:path*\,
      },
    ];
  },
};

export default nextConfig;\;

fs.writeFileSync('next.config.ts', content);
console.log('Updated next.config.ts with rewrites');
