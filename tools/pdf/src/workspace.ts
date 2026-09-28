import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * This package is a standalone sidecar at `<repo>/tools/pdf`, outside the pnpm
 * workspace, so paths are resolved from this file rather than `process.cwd()`,
 * which is only correct when a process happens to start here.
 */
const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)

export function repoRoot(): string {
  return path.resolve(packageDir, "..", "..")
}

export function articlesRoot(): string {
  return path.join(repoRoot(), "content", "articles")
}

export function siteRoot(): string {
  return path.join(repoRoot(), "apps", "web")
}

export function cacheDir(): string {
  return path.join(packageDir, ".cache")
}

/** Article HTML sidecars produced by `pnpm build:content`. */
export function sidecarDir(locale: string): string {
  return path.join(siteRoot(), "data", "pdf-html", locale)
}
