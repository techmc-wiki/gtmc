import { existsSync } from "node:fs"
import { spawnSync } from "node:child_process"

import { getWorkspaceRoot, workspacePath } from "@/lib/workspace-paths"
import { run, runScript } from "./lib/run"
import { createLogger, runBuildStep } from "./lib/logger"

const logger = createLogger("setup")

// Submodules and the shared .gitconfig live at the workspace root, not under
// apps/web, so every git invocation below is pinned there explicitly rather
// than inheriting this process's working directory.
const gitOptions = { cwd: getWorkspaceRoot() } as const

function isGitWorkTree() {
  if (!existsSync(workspacePath(".git"))) return false

  const result = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    ...gitOptions,
    stdio: "ignore",
  })

  return result.status === 0
}

function getSubmoduleStatus(submodule: string) {
  return spawnSync("git", ["submodule", "status", "--recursive", submodule], {
    ...gitOptions,
    encoding: "utf-8",
  })
}

function isSubmoduleInitialized(path: string) {
  const result = getSubmoduleStatus(path)
  if (result.status !== 0) return false

  const lines = result.stdout.split("\n").filter(Boolean)
  return (
    lines.length > 0 &&
    lines.every((line) => line.startsWith(" ") || line.startsWith("+"))
  )
}

function ensureSubmoduleInitialized(submodule: string) {
  let initialized = false
  if (!isSubmoduleInitialized(submodule)) {
    run("git", ["submodule", "update", "--init", "--recursive", submodule], {
      cwd: getWorkspaceRoot(),
    })
    initialized = true
  }

  if (!isSubmoduleInitialized(submodule)) {
    logger.error("submodule.unavailable", { path: submodule })
    process.exit(1)
  }

  logger.event("submodule.ready", {
    action: initialized ? "initialized" : "reused",
    path: submodule,
  })
}

const startedAt = performance.now()
logger.event("setup.started")

// GTMC_SKIP_POSTINSTALL is explicit; CI and Vercel also restore submodules outside
// install, where a second checkout can fail cached or shallow clones.
const isVercel = process.env.VERCEL === "1"
const skipHeavy = process.env.GTMC_SKIP_POSTINSTALL === "1" || isVercel

if (!skipHeavy && isGitWorkTree()) {
  run("git", ["config", "--local", "include.path", ".gitconfig"], {
    cwd: getWorkspaceRoot(),
  })

  ensureSubmoduleInitialized("content/articles")
  ensureSubmoduleInitialized("content/glossary")
  ensureSubmoduleInitialized("content/properties")

  runBuildStep(logger, "glossary", () =>
    runScript("scripts/generate-glossary-manifest.ts")
  )
} else if (isGitWorkTree()) {
  logger.event("setup.submodules.skipped", { reason: "environment" })
} else {
  logger.event("submodule.setup.skipped", { reason: "outside-work-tree" })
}

if (skipHeavy) {
  logger.event("setup.heavy-work.skipped", { reason: "environment" })
} else {
  runBuildStep(logger, "manifest", () =>
    runScript("scripts/generate-article-manifest.ts")
  )
  runBuildStep(logger, "repository-contributors", () =>
    runScript("scripts/generate-repository-contributor-stats.ts")
  )
}

logger.event("setup.completed", {
  duration_ms: Math.round(performance.now() - startedAt),
})
