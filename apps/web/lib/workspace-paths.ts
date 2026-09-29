import path from "node:path"

/**
 * Workspace root resolution.
 *
 * The site lives at `apps/web`, but the `content/articles` and
 * `content/glossary` submodules stay at the repository root, and so do
 * `tools/pdfgen` and the shared pnpm lockfile. Code that needs those must go
 * through `getWorkspaceRoot()` / `workspacePath(...)` rather than reaching for
 * `process.cwd()`, which is only correct when a process happens to have been
 * started from `apps/web`.
 *
 * This module is imported by runtime code (see `lib/articles/fs.ts`), so it
 * deliberately touches no filesystem: every export is a pure `path` operation
 * over a fixed depth.
 *
 * Resolution order:
 * 1. `GTMC_WORKSPACE_ROOT` — explicit override for environments whose working
 *    directory is outside the checkout (e.g. a deployed serverless task).
 * 2. `process.cwd()/../..` — the fixed depth of the layout: `apps/web` is two
 *    levels below the root.
 *
 * The root is computed once and cached; both it and `workspacePath` are kept
 * opaque to Next.js's static file-trace analysis (see the comments below), or
 * every dynamic read under a workspace path inflates route bundles with a
 * whole-repository wildcard. Files above `apps/web` that the running site
 * needs are declared explicitly instead (see `outputFileTracingRoot` and
 * `outputFileTracingIncludes` in `next.config.ts`).
 */

let cachedWorkspaceRoot: string | undefined

export function getWorkspaceRoot(): string {
  if (!cachedWorkspaceRoot) {
    // Two `..` levels up from the working directory is the fixed depth of the
    // layout. The loop keeps this computation opaque to Next.js's static
    // file-trace analysis: when the root folds to a literal, every dynamic
    // read under a workspace path inflates route bundles with a
    // whole-repository wildcard.
    let root = process.cwd()
    for (let depth = 0; depth < 2; depth += 1) {
      root = path.dirname(root)
    }
    cachedWorkspaceRoot = path.resolve(process.env.GTMC_WORKSPACE_ROOT ?? root)
  }
  return cachedWorkspaceRoot
}

/** Path to a workspace member, e.g. `workspacePath("content", "articles")`. */
export function workspacePath(...segments: string[]): string {
  // Folding over the segments keeps this expression opaque for the same
  // reason as the loop above; a `path.join(root, ...segments)` spread folds
  // to "dynamic path under root".
  return segments.reduce(
    (dir, segment) => path.join(dir, segment),
    getWorkspaceRoot()
  )
}
