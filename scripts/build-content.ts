/**
 * Content-generation phase of the production build.
 *
 * Manifest, glossary, and rendered article sidecars are generated here.
 * PDF generation runs separately via `pnpm build:pdf`.
 *
 * Usage: pnpm build:content
 */
import { runScript } from "./lib/run"
import { createLogger, runBuildStep } from "./lib/logger"

const logger = createLogger("content")

const steps: Array<{ stage: string; script: string; args?: string[] }> = [
  {
    stage: "repository-contributors",
    script: "scripts/generate-repository-contributor-stats.ts",
  },
  { stage: "manifest", script: "scripts/generate-article-manifest.ts" },
  {
    stage: "glossary",
    script: "scripts/generate-glossary-manifest.ts",
  },
  {
    stage: "article-content",
    script: "scripts/generate-article-content.ts",
  },
]

const startedAt = performance.now()
logger.event("content.started", { stage_count: steps.length })

for (const step of steps) {
  runBuildStep(logger, step.stage, () =>
    runScript(step.script, step.args ?? [])
  )
}

logger.event("content.completed", {
  duration_ms: Math.round(performance.now() - startedAt),
  stage_count: steps.length,
})
