import { existsSync } from "node:fs"
import { spawnSync } from "node:child_process"

import { run, runScript } from "./lib/run"

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
  if (!isSubmoduleInitialized(path)) {
    run("git", ["submodule", "update", "--init", "--recursive", path])
  }

  if (!isSubmoduleInitialized(path)) {
    process.stderr.write(`Submodule ${path} is not correctly initialized\n`)
    process.exit(1)
  }

  process.stdout.write(`Submodule ${path} is initialized\n`)
}

if (isGitWorkTree()) {
  run("git", ["config", "--local", "include.path", ".gitconfig"])

  ensureSubmoduleInitialized("articles")
  ensureSubmoduleInitialized("glossary")

  process.stdout.write("  Generating glossary manifest...\n")
  runScript("scripts/generate-glossary-manifest.ts")
} else {
  process.stdout.write("Skipping Git submodule setup outside a Git work tree\n")
}

// Heavy steps (prisma generate, article manifest, chromium install) are
// skipped in CI lint runs and when explicitly opted out, so a pure lint
// job doesn't pay for the full content pipeline.
const isCI = process.env.CI === "true"
const isVercel = process.env.VERCEL === "1"
const skipHeavy =
  process.env.GTMC_SKIP_POSTINSTALL === "1" ||
  (isCI && !isVercel && process.env.GTMC_LINT_ONLY === "1")

if (skipHeavy) {
  process.stdout.write(
    "Skipping heavy postinstall steps (prisma generate, article manifest, chromium install)\n"
  )
} else {
  run("prisma", ["generate"], {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? placeholderDatabaseUrl,
    },
  })
  runScript("scripts/generate-article-manifest.ts")
  runScript("scripts/generate-author-profiles.ts")
  run("playwright", ["install", "chromium"])
}
