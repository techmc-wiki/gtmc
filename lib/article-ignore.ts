export const IGNORED_DIRECTORIES: readonly string[] = [
  "img",
  "oldimg",
  "image",
  "images",
  "source",
  "asset",
  "exampleworld",
  "desynchronized",
  ".git",
  ".github",
]

export const IGNORED_ROOT_FILES: readonly string[] = [
  "readme.md",
  "contributors.md",
  "_sidebar.md",
  "desynchronized.md",
]

export function shouldIgnoreDirectory(name: string): boolean {
  if (name.startsWith("_")) {
    return true
  }
  return IGNORED_DIRECTORIES.some(
    (dir) => dir.toLowerCase() === name.toLowerCase()
  )
}

export function shouldIgnoreFile(name: string, isRoot: boolean): boolean {
  if (name.startsWith("_")) {
    return true
  }
  if (isRoot) {
    return IGNORED_ROOT_FILES.some(
      (file) => file.toLowerCase() === name.toLowerCase()
    )
  }
  return false
}
