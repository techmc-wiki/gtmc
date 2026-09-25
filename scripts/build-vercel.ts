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
    "--remote",
    "articles",
  ])
  run("git", ["submodule", "update", "--init", "--recursive", "glossary"])
  run("git", ["fetch", "--tags"])
})

runBuildStep(logger, "prisma.generate", () => run("prisma", ["generate"]))

const contentCache = createContentArtifactCache()
const restoredContent = contentCache
  ? restoreContentArtifacts(contentCache)
  : false

if (restoredContent) {
  process.env.GTMC_SKIP_CONTENT_BUILD = "true"
} else {
  delete process.env.GTMC_SKIP_CONTENT_BUILD
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
