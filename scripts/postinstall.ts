import { existsSync } from "node:fs"
import { spawnSync } from "node:child_process"

import { run, runScript } from "./lib/run"
import { createLogger, runBuildStep } from "./lib/logger"

const logger = createLogger("setup")

const placeholderDatabaseUrl = "postgresql://localhost:5432/placeholder"

function isGitWorkTree() {
  if (!existsSync(".git")) return false

  const result = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    stdio: "ignore",
  })

  return result.status === 0
}

function getSubmoduleStatus(path: string) {
  return spawnSync("git", ["submodule", "status", "--recursive", path], {
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

function ensureSubmoduleInitialized(path: string) {
  let initialized = false
  if (!isSubmoduleInitialized(path)) {
    run("git", ["submodule", "update", "--init", "--recursive", path])
    initialized = true
  }

  if (!isSubmoduleInitialized(path)) {
    logger.error("submodule.unavailable", { path })
    process.exit(1)
  }

  logger.event("submodule.ready", {
    action: initialized ? "initialized" : "reused",
    path,
  })
}

const startedAt = performance.now()
logger.event("setup.started")

// The skip flag gates submodule/content setup too: CI checks out submodules
// in the workflow and Vercel prepares them inside build:vercel, so the
// install-time copy is redundant there — and hard-fails the install when
// the clone or build cache lacks submodule content.
const isCI = process.env.CI === "true"
const isVercel = process.env.VERCEL === "1"
const skipHeavy =
  process.env.GTMC_SKIP_POSTINSTALL === "1" ||
  (isCI && !isVercel && process.env.GTMC_LINT_ONLY === "1")

if (!skipHeavy && isGitWorkTree()) {
  run("git", ["config", "--local", "include.path", ".gitconfig"])

  ensureSubmoduleInitialized("articles")
  ensureSubmoduleInitialized("glossary")

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
  runBuildStep(logger, "prisma.generate", () =>
    run("prisma", ["generate"], {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL ?? placeholderDatabaseUrl,
      },
    })
  )
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
