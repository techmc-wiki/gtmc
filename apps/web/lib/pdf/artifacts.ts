/**
 * Shared filesystem helpers for the PDF pipeline: artifacts are written
 * atomically, and paths handed to Typst are validated against its root.
 */

import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { workspacePath } from "@/lib/workspace-paths"

const PDF_ROOT = workspacePath("tools", "pdf")

/**
 * Writes through a sibling temporary file and renames it into place, so a
 * concurrent reader never observes a partially written artifact.
 */
export async function writeFileAtomic(
  target: string,
  data: string | Buffer
): Promise<void> {
  const temp = `${target}.${process.pid}.${crypto.randomUUID()}.part`
  try {
    await fs.promises.writeFile(temp, data, "utf-8")
    await fs.promises.rename(temp, target)
  } catch (error) {
    await fs.promises.rm(temp, { force: true })
    throw error
  }
}

/** Converts an absolute output path to the `/work/...` form Typst resolves. */
export function toTypstRootPath(file: string): string {
  const relative = path.relative(PDF_ROOT, file)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Output ${file} is outside the Typst root ${PDF_ROOT}`)
  }
  return `/${relative.split(path.sep).join("/")}`
}
