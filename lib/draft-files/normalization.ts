export function normalizeDraftFilePath(filePath: string) {
  return filePath.trim().replace(/\\/g, "/").replace(/^\/+/, "")
}

export function normalizeDraftFolderPath(folderPath: string) {
  return normalizeDraftFilePath(folderPath).replace(/\/+$/, "")
}

export function normalizeComparablePath(filePath: string | undefined) {
  return normalizeDraftFilePath(filePath || "").toLowerCase()
}

export function collectParentFolders(filePaths: string[]) {
  const folders = new Set<string>()

  for (const filePath of filePaths) {
    const normalizedPath = normalizeDraftFilePath(filePath)
    if (!normalizedPath) {
      continue
    }

    const segments = normalizedPath.split("/").slice(0, -1)
    let cursor = ""

    for (const segment of segments) {
      cursor = cursor ? `${cursor}/${segment}` : segment
      folders.add(cursor)
    }
  }

  return [...folders]
}

export function listFolderAncestors(folderPath: string) {
  const ancestors: string[] = []
  const segments = normalizeDraftFolderPath(folderPath)
    .split("/")
    .filter(Boolean)
  let cursor = ""

  for (const segment of segments) {
    cursor = cursor ? `${cursor}/${segment}` : segment
    ancestors.push(cursor)
  }

  return ancestors
}
