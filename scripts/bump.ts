#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

type BumpType = "patch" | "minor" | "major"
const VALID_BUMP_TYPES: Record<BumpType, true> = {
  patch: true,
  minor: true,
  major: true,
}

function git(args: string[], cwd?: string): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim()
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string }
    const message = err.stderr ? err.stderr.trim() : (err.message ?? String(error))
    throw new Error(`git ${args.join(" ")} failed: ${message}`)
  }
}

function resolveRepoRoot(): string {
  try {
    return git(["rev-parse", "--show-toplevel"])
  } catch {
    return process.cwd()
  }
}

function getDefaultBranch(root: string): string {
  try {
    const ref = git(["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], root)
    if (ref.startsWith("origin/")) {
      return ref.slice("origin/".length)
    }
    return ref
  } catch {
    return "dev"
  }
}

function bumpVersion(version: string, type: BumpType): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) {
    throw new Error(`Version "${version}" is not a valid standard semver (X.Y.Z)`)
  }

  let major = Number.parseInt(match[1], 10)
  let minor = Number.parseInt(match[2], 10)
  let patch = Number.parseInt(match[3], 10)

  if (type === "major") {
    major += 1
    minor = 0
    patch = 0
  } else if (type === "minor") {
    minor += 1
    patch = 0
  } else {
    patch += 1
  }

  return `${major}.${minor}.${patch}`
}

function main(): void {
  const repoRoot = resolveRepoRoot()
  const rawArgs = process.argv.slice(2)

  const isDryRun = rawArgs.includes("--dry-run")
  const filteredArgs = rawArgs.filter((arg) => !arg.startsWith("-"))

  const rawType = filteredArgs[0] ?? "patch"
  if (!(rawType in VALID_BUMP_TYPES)) {
    console.error(`Error: Invalid bump type "${rawType}". Expected "patch", "minor", or "major".`)
    process.exit(1)
  }
  const bumpType = rawType as BumpType
  // 1. Verify default branch
  const currentBranch = git(["branch", "--show-current"], repoRoot)
  if (!currentBranch) {
    console.error("Error: HEAD is detached. You must be on the default branch to bump version.")
    process.exit(1)
  }

  const defaultBranch = getDefaultBranch(repoRoot)
  if (currentBranch !== defaultBranch) {
    console.error(
      `Error: bump can only be run on the default branch ("${defaultBranch}"). Currently on "${currentBranch}".`
    )
    process.exit(1)
  }

  // 2. Verify clean workspace
  const status = git(["status", "--porcelain"], repoRoot)
  if (status.length > 0) {
    console.error("Error: Workspace is not clean. Commit or stash changes before bumping:")
    console.error(status)
    process.exit(1)
  }

  // 3. Read and update version info
  const webPkgPath = path.join(repoRoot, "apps/web/package.json")
  if (!existsSync(webPkgPath)) {
    console.error(`Error: Could not find apps/web/package.json at ${webPkgPath}`)
    process.exit(1)
  }

  const webPkg = JSON.parse(readFileSync(webPkgPath, "utf-8")) as {
    version?: string
    [key: string]: unknown
  }
  const currentVersion = webPkg.version
  if (!currentVersion || typeof currentVersion !== "string") {
    console.error(`Error: apps/web/package.json does not contain a valid version`)
    process.exit(1)
  }

  const nextVersion = bumpVersion(currentVersion, bumpType)
  const tagName = `v${nextVersion}`
  const commitMessage = `chore: bump package version to ${tagName}`

  console.log(`Bumping version: ${currentVersion} -> ${nextVersion} (${bumpType})`)

  if (isDryRun) {
    console.log(`[dry-run] Would update ${webPkgPath} version to ${nextVersion}`)
    console.log(`[dry-run] Would create commit: "${commitMessage}"`)
    console.log(`[dry-run] Would create tag: "${tagName}"`)
    return
  }

  webPkg.version = nextVersion
  writeFileSync(webPkgPath, `${JSON.stringify(webPkg, null, 2)}\n`, "utf-8")

  const rootPkgPath = path.join(repoRoot, "package.json")
  const filesToStage = ["apps/web/package.json"]

  if (existsSync(rootPkgPath)) {
    const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf-8")) as {
      version?: string
      [key: string]: unknown
    }
    if (rootPkg.version) {
      rootPkg.version = nextVersion
      writeFileSync(rootPkgPath, `${JSON.stringify(rootPkg, null, 2)}\n`, "utf-8")
      filesToStage.push("package.json")
    }
  }

  // 4. Automatically create commit & tag
  git(["add", ...filesToStage], repoRoot)
  git(["commit", "-m", commitMessage], repoRoot)
  git(["tag", "-m", "", tagName], repoRoot)

  console.log(`Successfully committed "${commitMessage}" and created tag ${tagName}.`)
}

main()
