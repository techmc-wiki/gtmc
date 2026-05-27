import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "schema.prisma",
  datasource: {
    // Migrations require a direct (non-pooled) connection to avoid
    // "prepared statement already exists" errors with PgBouncer.
    // Falls back to DATABASE_URL for local development where pooling
    // is typically not in the path.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
})
