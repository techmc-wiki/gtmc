import { spawnSync } from "node:child_process"

type ArticleSourceMode = "pinned" | "latest"

const sourceMode = parseArticleSourceMode(process.env.GTMC_ARTICLES_SOURCE)

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

function runGitSubmoduleUpdate(mode: ArticleSourceMode): void {
  const args =
    mode === "latest"
      ? ["submodule", "update", "--init", "--recursive", "--remote", "articles"]
      : ["submodule", "update", "--init", "--recursive", "articles"]

  process.stdout.write(
    mode === "latest"
      ? "Preparing articles from latest configured submodule branch\n"
      : "Preparing articles from pinned submodule commit\n"
  )

  const result = spawnSync("git", args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (sourceMode) {
  runGitSubmoduleUpdate(sourceMode)
} else {
  process.stdout.write(
    "GTMC_ARTICLES_SOURCE is unset; leaving articles submodule unchanged\n"
  )
}
