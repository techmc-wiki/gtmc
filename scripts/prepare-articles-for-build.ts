import { run } from "./lib/run"
import { createLogger, runBuildStep } from "./lib/logger"

const logger = createLogger("articles")

type ArticleSourceMode = "pinned" | "latest"

function parseArticleSourceMode(
  value: string | undefined
): ArticleSourceMode | undefined {
  const trimmedValue = value?.trim()

  if (!trimmedValue) return undefined
  if (trimmedValue === "pinned") return "pinned"
  if (trimmedValue === "latest") return "latest"

  logger.error(
    "articles.prepare.invalid-source",
    { source: trimmedValue },
    'Expected "pinned" or "latest".'
  )
  process.exit(1)
}

const sourceMode = parseArticleSourceMode(process.env.GTMC_ARTICLES_SOURCE)

if (sourceMode) {
  const args =
    sourceMode === "latest"
      ? ["submodule", "update", "--init", "--recursive", "--remote", "articles"]
      : ["submodule", "update", "--init", "--recursive", "articles"]

  runBuildStep(logger, "submodule.update", () => run("git", args), {
    source: sourceMode,
  })
} else {
  logger.event("articles.prepare.skipped", { reason: "source-unset" })
}
