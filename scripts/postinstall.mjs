import { existsSync, readdirSync } from "node:fs"
import { spawnSync } from "node:child_process"

const placeholderDatabaseUrl = "postgresql://localhost:5432/placeholder"

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function isGitWorkTree() {
  if (!existsSync(".git")) return false

  const result = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    stdio: "ignore",
  })

  return result.status === 0
}

if (isGitWorkTree()) {
  run("git", ["config", "--local", "include.path", ".gitconfig"])

  if (!existsSync("articles") || readdirSync("articles").length === 0) {
    run("git", ["submodule", "update", "--init", "--recursive"])
  } else {
    process.stdout.write(
      "Skipping article submodule checkout because articles/ already exists\n"
    )
  }

  if (!existsSync("glossary") || readdirSync("glossary").length === 0) {
    run("git", ["submodule", "update", "--init", "--recursive"])
  } else {
    process.stdout.write(
      "Skipping glossary submodule checkout because glossary/ already exists\n"
    )
    process.stdout.write("  Generating glossary manifest...\n")
    run("tsx", ["scripts/generate-glossary-manifest.ts"])
  }
} else {
  process.stdout.write("Skipping Git submodule setup outside a Git work tree\n")
}

run("prisma", ["generate"], {
  env: {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL ?? placeholderDatabaseUrl,
  },
})
run("tsx", ["scripts/generate-article-manifest.ts"])
run("playwright", ["install", "chromium"])
