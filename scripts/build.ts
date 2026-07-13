/**
 * Full production build: content artifacts (unless skipped) then Next.js.
 *
 * Set GTMC_SKIP_CONTENT_BUILD=true to reuse cached content artifacts
 * (used by CI when the content cache hits).
 *
 * Usage: pnpm build
 */
import { run, runScript } from "./lib/run"

const skipContent = process.env.GTMC_SKIP_CONTENT_BUILD === "true"

if (!skipContent) {
  runScript("scripts/build-content.ts")
} else {
  process.stdout.write(
    "GTMC_SKIP_CONTENT_BUILD=true — skipping content generation\n"
  )
}

run("next", ["build"])
