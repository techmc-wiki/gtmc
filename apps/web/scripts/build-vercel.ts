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
  // Vercel's clone can leave a submodule whose repository already holds the
  // pinned commit while its worktree is empty (it reports "Failed to fetch one
  // or more git submodules" and moves on). `submodule update` then no-ops with
  // exit 0, and the missing sources only surface much later as an ENOENT deep
  // inside content generation. `--force` re-runs the checkout unconditionally.
  const submoduleUpdate = ["submodule", "update", "--init", "--recursive"]
  run("git", [...submoduleUpdate, "--force", "--remote", "content/articles"], {
    cwd,
  })
  run("git", [...submoduleUpdate, "--force", "content/glossary"], { cwd })
  run("git", ["fetch", "--tags"], { cwd })
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
