import { copyFileSync, mkdirSync } from "node:fs"
import path from "node:path"

import { workspacePath } from "@/lib/workspace-paths"
import { createLogger } from "./lib/logger"

/**
 * Stage the contribution guides the draft editor shows at request time.
 *
 * The sources live at the workspace root and in the articles submodule, but a
 * deployed task only ships the app's own tree. Reading them through
 * `workspacePath` at request time is also not an option: any `fs` call with a
 * statically unresolvable argument makes Next.js's file tracer fall back to a
 * whole-project wildcard, shipping the repository into the route bundle
 * (measured at 80+ MiB). Copies staged under `data/contributing/` fold to
 * exact files in the trace instead (see
 * `app/[locale]/(private)/draft/[id]/page.tsx`).
 */
const DRAFT_GUIDES = [
  { source: ["CONTRIBUTING.md"], target: "web.md" },
  { source: ["articles", "CONTRIBUTING.md"], target: "articles.md" },
] as const

const logger = createLogger("draft-guides")

function main(): void {
  const outputDir = path.join(process.cwd(), "data", "contributing")
  mkdirSync(outputDir, { recursive: true })

  for (const guide of DRAFT_GUIDES) {
    const source = workspacePath(...guide.source)
    const target = path.join("data", "contributing", guide.target)
    copyFileSync(source, path.join(process.cwd(), target))
    logger.event("draft-guide.staged", { source, target })
  }
}

main()
