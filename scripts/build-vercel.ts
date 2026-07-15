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
import { createLogger, runBuildStep } from "./lib/logger"

const logger = createLogger("vercel")
const startedAt = performance.now()

logger.event("build.started")
runBuildStep(logger, "repository.prepare", () => {
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
})

process.env.GTMC_ARTICLES_SOURCE = "latest"
runBuildStep(logger, "articles.prepare", () =>
  runScript("scripts/prepare-articles-for-build.ts")
)

runBuildStep(logger, "prisma.generate", () => run("prisma", ["generate"]))

const contentCache = createContentArtifactCache()
const restoredContent = contentCache
  ? restoreContentArtifacts(contentCache)
  : false

if (restoredContent) {
  process.env.GTMC_SKIP_CONTENT_BUILD = "true"
} else {
  delete process.env.GTMC_SKIP_CONTENT_BUILD
  runBuildStep(logger, "browser.install", () =>
    run("playwright", ["install", "chromium"])
  )
}

runBuildStep(logger, "prisma.migrate", () =>
  run("prisma", ["migrate", "deploy"])
)
runBuildStep(logger, "application.build", () => runScript("scripts/build.ts"))

if (contentCache && !restoredContent) {
  saveContentArtifacts(contentCache)
}

logger.event("build.completed", {
  content_cache: restoredContent ? "hit" : "miss",
  duration_ms: Math.round(performance.now() - startedAt),
})
