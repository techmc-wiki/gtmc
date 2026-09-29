// eslint-disable-next-line import/no-unassigned-import
import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "schema.prisma",
  datasource: {
    // Prisma migrations require a direct connection; DATABASE_URL is the
    // local-development fallback when no pooler is present.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
})
