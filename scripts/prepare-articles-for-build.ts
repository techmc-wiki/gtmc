import { spawnSync } from "node:child_process"

type ArticleSourceMode = "pinned" | "latest"

const sourceMode = parseArticleSourceMode(process.env.GTMC_ARTICLES_SOURCE)

function parseArticleSourceMode(value: string | undefined): ArticleSourceMode {
  if (!value || value === "pinned") return "pinned"
  if (value === "latest") return "latest"

  process.stderr.write(
    `Invalid GTMC_ARTICLES_SOURCE=${value}. Expected "pinned" or "latest".\n`
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

runGitSubmoduleUpdate(sourceMode)
