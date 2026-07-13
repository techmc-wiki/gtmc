/**
 * Vercel production build entrypoint (see vercel.json buildCommand).
 *
 * 1. Refresh tags for version metadata
 * 2. Ensure Chromium for PDF generation
 * 3. Pull latest articles submodule branch (GTMC_ARTICLES_SOURCE=latest)
 * 4. Apply Prisma migrations
 * 5. Full site build
 *
 * Usage: pnpm build:vercel
 */
import { run, runScript } from "./lib/run"

process.env.GTMC_ARTICLES_SOURCE = "latest"

run("git", ["fetch", "--tags"])
run("playwright", ["install", "chromium"])
runScript("scripts/prepare-articles-for-build.ts")
run("prisma", ["migrate", "deploy"])
runScript("scripts/build.ts")
