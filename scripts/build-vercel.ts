/**
 * Vercel production build entrypoint (see vercel.json buildCommand).
 * 1. Initialize Git configuration and both content submodules
 * 2. Refresh tags and select the latest articles revision
 * 3. Generate Prisma Client, restore or generate content artifacts, and apply migrations
 * 4. Build Next.js
 *
 * Usage: pnpm build:vercel
 */
import {
  createContentArtifactCache,
  restoreContentArtifacts,
  saveContentArtifacts,
} from "./lib/content-artifact-cache"
import { run, runScript } from "./lib/run"

run("git", ["config", "--local", "include.path", ".gitconfig"])
run("git", [
  "submodule",
  "update",
  "--init",
  "--recursive",
  "articles",
  "glossary",
])
run("git", ["fetch", "--tags"])

process.env.GTMC_ARTICLES_SOURCE = "latest"
runScript("scripts/prepare-articles-for-build.ts")

run("prisma", ["generate"])

const contentCache = createContentArtifactCache()
const restoredContent = contentCache
  ? restoreContentArtifacts(contentCache)
  : false

if (restoredContent) {
  process.env.GTMC_SKIP_CONTENT_BUILD = "true"
} else {
  delete process.env.GTMC_SKIP_CONTENT_BUILD
  run("playwright", ["install", "chromium"])
}

run("prisma", ["migrate", "deploy"])
runScript("scripts/build.ts")

if (contentCache && !restoredContent) {
  saveContentArtifacts(contentCache)
}
