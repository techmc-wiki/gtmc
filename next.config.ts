import type { NextConfig } from "next";

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
        destination: `https://${process.env.COS_BUCKET}.cos.${process.env.COS_REGION}.myqcloud.com/:path*`,
      },
    ];
  },
};

export default nextConfig;
