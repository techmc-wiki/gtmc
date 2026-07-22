/**
 * Full production build: content artifacts (unless skipped) then Next.js.
 *
 * Set GTMC_SKIP_CONTENT_BUILD=true to reuse cached content artifacts
 * (used by CI when the content cache hits).
 *
 * Usage: pnpm build
 */
import { runScript } from "./lib/run"
import { createLogger, runBuildStep } from "./lib/logger"

const logger = createLogger("build")

const skipContent = process.env.GTMC_SKIP_CONTENT_BUILD === "true"
const startedAt = performance.now()

logger.event("build.started", { content_generation: !skipContent })

if (!skipContent) {
  runBuildStep(logger, "content", () => runScript("scripts/build-content.ts"))
} else {
  logger.event("content.reused", { reason: "GTMC_SKIP_CONTENT_BUILD" })
  runBuildStep(logger, "repository-contributors", () =>
    runScript("scripts/generate-repository-contributor-stats.ts")
  )
}

runBuildStep(logger, "next", () => runScript("scripts/build-next.ts"))
logger.event("build.completed", {
  duration_ms: Math.round(performance.now() - startedAt),
})
