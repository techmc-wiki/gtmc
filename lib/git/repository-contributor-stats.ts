import { execFileSync } from "node:child_process"

const COMMIT_MARKER = "__GTMC_COMMIT__"
const FIELD_SEPARATOR = "\u001f"

export interface ParsedCommit {
  authorName: string
  authorEmail: string
  linesChanged: number
}

export interface RepositoryContributorStats {
  commits: number
  linesChanged: number
}

let repositoryLogCache: ParsedCommit[] | null = null

export function parseRepositoryLog(output: string): ParsedCommit[] {
  const commits: ParsedCommit[] = []
  let current: ParsedCommit | null = null

  for (const line of output.split("\n")) {
    if (line.startsWith(`${COMMIT_MARKER}${FIELD_SEPARATOR}`)) {
      const [, authorName = "", authorEmail = ""] = line.split(FIELD_SEPARATOR)
      current = { authorName, authorEmail, linesChanged: 0 }
      commits.push(current)
      continue
    }

    if (current === null) continue
    const match = /^(\d+|-)\t(\d+|-)\t/.exec(line)
    if (match === null) continue

    const insertions = match[1] === "-" ? 0 : Number(match[1])
    const deletions = match[2] === "-" ? 0 : Number(match[2])
    current.linesChanged += insertions + deletions
  }

  return commits
}

function loadRepositoryLog(): ParsedCommit[] {
  if (repositoryLogCache !== null) return repositoryLogCache

  try {
    const output = execFileSync(
      "git",
      [
        "log",
        `--format=${COMMIT_MARKER}%x1f%aN%x1f%aE`,
        "--numstat",
        "--no-renames",
        "HEAD",
        "--",
        ".",
        ":(exclude)articles",
        ":(exclude)glossary",
      ],
      { cwd: process.cwd(), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
    )
    repositoryLogCache = parseRepositoryLog(output)
  } catch {
    repositoryLogCache = []
  }

  return repositoryLogCache
}

function normalizeIdentity(value: string): string {
  return value.trim().toLocaleLowerCase("en-US")
}

function getCommitIdentities(commit: ParsedCommit): Set<string> {
  const emailLocalPart = commit.authorEmail.split("@")[0] ?? ""
  const emailAlias = emailLocalPart.includes("+")
    ? (emailLocalPart.split("+").at(-1) ?? "")
    : emailLocalPart

  return new Set(
    [commit.authorName, commit.authorEmail, emailLocalPart, emailAlias]
      .map(normalizeIdentity)
      .filter(Boolean)
  )
}

export function calculateRepositoryContributorStats(
  repositoryLog: ParsedCommit[],
  identities: string[]
): RepositoryContributorStats {
  const targets = new Set(identities.map(normalizeIdentity).filter(Boolean))
  let commits = 0
  let linesChanged = 0

  for (const commit of repositoryLog) {
    const matches = [...getCommitIdentities(commit)].some((identity) =>
      targets.has(identity)
    )
    if (!matches) continue

    commits += 1
    linesChanged += commit.linesChanged
  }

  return { commits, linesChanged }
}

export function getRepositoryContributorStats(
  identities: string[]
): RepositoryContributorStats {
  return calculateRepositoryContributorStats(loadRepositoryLog(), identities)
}
