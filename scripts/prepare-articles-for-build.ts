import { run } from "./lib/run"

type ArticleSourceMode = "pinned" | "latest"

function parseArticleSourceMode(
  value: string | undefined
): ArticleSourceMode | undefined {
  const trimmedValue = value?.trim()

  if (!trimmedValue) return undefined
  if (trimmedValue === "pinned") return "pinned"
  if (trimmedValue === "latest") return "latest"

  process.stderr.write(
    `Invalid GTMC_ARTICLES_SOURCE=${trimmedValue}. Expected "pinned" or "latest".\n`
  )
  process.exit(1)
}

const sourceMode = parseArticleSourceMode(process.env.GTMC_ARTICLES_SOURCE)

if (sourceMode) {
  const args =
    sourceMode === "latest"
      ? ["submodule", "update", "--init", "--recursive", "--remote", "articles"]
      : ["submodule", "update", "--init", "--recursive", "articles"]

  process.stdout.write(
    sourceMode === "latest"
      ? "Preparing articles from latest configured submodule branch\n"
      : "Preparing articles from pinned submodule commit\n"
  )

  run("git", args)
} else {
  process.stdout.write(
    "GTMC_ARTICLES_SOURCE is unset; leaving articles submodule unchanged\n"
  )
}
