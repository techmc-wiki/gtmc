import {
  createContentArtifactCache,
  restoreContentArtifacts,
  saveContentArtifacts,
} from "./lib/content-artifact-cache"
import { getWorkspaceRoot } from "@/lib/workspace-paths"
import { run, runScript } from "./lib/run"
import { createLogger, runBuildStep } from "./lib/logger"

const logger = createLogger("vercel")
const startedAt = performance.now()

logger.event("build.started")
runBuildStep(logger, "repository.prepare", () => {
  // Submodules, .gitconfig, and tag fetches all belong to the workspace root.
  const cwd = getWorkspaceRoot()
  run("git", ["config", "--local", "include.path", ".gitconfig"], { cwd })
  const submoduleUpdate = ["submodule", "update", "--init", "--recursive"]
  run("git", [...submoduleUpdate, "--remote", "content/articles"], { cwd })
  run("git", [...submoduleUpdate, "content/glossary"], { cwd })
  run("git", [...submoduleUpdate, "content/properties"], { cwd })
  run("git", ["fetch", "--tags"], { cwd })
})

const contentCache = createContentArtifactCache()
const restoredContent = contentCache
  ? restoreContentArtifacts(contentCache)
  : false

if (restoredContent) {
  process.env.GTMC_SKIP_CONTENT_BUILD = "true"
} else {
  delete process.env.GTMC_SKIP_CONTENT_BUILD
}
runBuildStep(logger, "application.build", () => runScript("scripts/build.ts"))

if (contentCache && !restoredContent) {
  saveContentArtifacts(contentCache)
}

logger.event("build.completed", {
  content_cache: restoredContent ? "hit" : "miss",
  duration_ms: Math.round(performance.now() - startedAt),
})
