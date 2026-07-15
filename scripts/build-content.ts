/**
 * Content-generation phase of the production build.
 *
 * Order matters: manifest feeds author profiles and rendered content;
 * glossary is independent but lives in the same artifact phase; PDF
 * needs rendered content + manifest.
 *
 * Usage: pnpm build:content
 */
import { runScript } from "./lib/run"
import { createLogger, runBuildStep } from "./lib/logger"

const logger = createLogger("content")

const steps: Array<{ stage: string; script: string; args?: string[] }> = [
  { stage: "manifest", script: "scripts/generate-article-manifest.ts" },
  {
    stage: "author-profiles",
    script: "scripts/generate-author-profiles.ts",
  },
  {
    stage: "glossary",
    script: "scripts/generate-glossary-manifest.ts",
  },
  {
    stage: "article-content",
    script: "scripts/generate-article-content.ts",
  },
  {
    stage: "pdf",
    script: "scripts/generate-pdf.ts",
    args: ["--locale", "all"],
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
