/**
 * Content-generation phase of the production build.
 *
 * Manifest, glossary, and rendered article sidecars are generated here.
 * PDF generation runs separately via `pnpm build:pdf`.
 *
 * Usage: pnpm build:content
 */
import { runScriptAsync } from "./lib/run"
import { createLogger, describeError, runBuildStep } from "./lib/logger"

const logger = createLogger("content")
async function main(): Promise<void> {
  const startedAt = performance.now()
  logger.event("content.started", { stage_count: 4 })

  await Promise.all([
    runBuildStep(logger, "repository-contributors", () =>
      runScriptAsync("scripts/generate-repository-contributor-stats.ts")
    ),
    runBuildStep(logger, "manifest", () =>
      runScriptAsync("scripts/generate-article-manifest.ts")
    ),
    runBuildStep(logger, "glossary", () =>
      runScriptAsync("scripts/generate-glossary-manifest.ts")
    ),
  ])

  await runBuildStep(logger, "article-content", () =>
    runScriptAsync("scripts/generate-article-content.ts")
  )

  logger.event("content.completed", {
    duration_ms: Math.round(performance.now() - startedAt),
    stage_count: 4,
  })
}

main().catch((error: unknown) => {
  logger.error("content.failed", {}, describeError(error))
  process.exit(1)
})
