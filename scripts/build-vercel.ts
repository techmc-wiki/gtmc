/**
 * Vercel production build entrypoint (see vercel.json buildCommand).
 * 1. Initialize Git configuration and both content submodules
 * 2. Refresh tags and latest articles branch
 * 3. Generate Prisma Client, install Chromium, and apply migrations
 * 4. Full site build
 *
 * Usage: pnpm build:vercel
 */
import { run, runScript } from "./lib/run"

run("git", ["config", "--local", "include.path", ".gitconfig"])
run("git", [
  "submodule",
  "update",
  "--init",
  "--recursive",
  "articles",
  "glossary",
])
run("git", ["fetch", "--tags"])

process.env.GTMC_ARTICLES_SOURCE = "latest"
runScript("scripts/prepare-articles-for-build.ts")

run("prisma", ["generate"])
run("playwright", ["install", "chromium"])
run("prisma", ["migrate", "deploy"])
runScript("scripts/build.ts")
