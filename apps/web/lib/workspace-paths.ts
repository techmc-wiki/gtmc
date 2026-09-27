import path from "node:path"

/**
 * Workspace root resolution.
 *
 * The site lives at `apps/web`, but the `articles/` and `glossary/` submodules
 * stay at the repository root, and so do `tools/pdfgen` and the shared pnpm
 * lockfile. Code that needs those must not reach for `process.cwd()`, which is
 * only correct when a process happens to have been started from `apps/web`.
 *
 * This module is imported by runtime code (see `lib/articles/fs.ts`), so it
 * deliberately touches no filesystem: every export is a pure `path.join` over a
 * fixed depth. A resolver that walked the tree looking for `pnpm-workspace.yaml`
 * would drag `node:fs` into the component graph, break static analysis, and
 * force Next.js to trace the whole project into the server bundle.
 *
 * The depth is fixed by the layout: apps/web is two levels below the root.
 */

export const WORKSPACE_ROOT = path.resolve(process.cwd(), "..", "..")

/** Path to a workspace member, e.g. `workspacePath("articles")`. */
export function workspacePath(...segments: string[]): string {
  return path.join(/*turbopackIgnore: true*/ WORKSPACE_ROOT, ...segments)
}
