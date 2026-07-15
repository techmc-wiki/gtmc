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

if (isGitWorkTree()) {
  run("git", ["config", "--local", "include.path", ".gitconfig"])

  ensureSubmoduleInitialized("articles")
  ensureSubmoduleInitialized("glossary")

  runBuildStep(logger, "glossary", () =>
    runScript("scripts/generate-glossary-manifest.ts")
  )
} else {
  logger.event("submodule.setup.skipped", { reason: "outside-work-tree" })
}

// Heavy steps (prisma generate, article manifest, chromium install) are
// skipped in CI lint runs and when explicitly opted out, so a pure lint
// job doesn't pay for the full content pipeline. Build CI also skips them
// and installs Chromium only when content/PDF artifacts must be regenerated.
const isCI = process.env.CI === "true"
const isVercel = process.env.VERCEL === "1"
const skipHeavy =
  process.env.GTMC_SKIP_POSTINSTALL === "1" ||
  (isCI && !isVercel && process.env.GTMC_LINT_ONLY === "1")
const skipPlaywright = skipHeavy || process.env.GTMC_SKIP_PLAYWRIGHT === "1"

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
  runBuildStep(logger, "author-profiles", () =>
    runScript("scripts/generate-author-profiles.ts")
  )
  if (skipPlaywright) {
    logger.event("browser.install.skipped", { reason: "environment" })
  } else {
    runBuildStep(logger, "browser.install", () =>
      run("playwright", ["install", "chromium"])
    )
  }
}

logger.event("setup.completed", {
  duration_ms: Math.round(performance.now() - startedAt),
})
