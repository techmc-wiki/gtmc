export function isReservedArticlePath(filePath: string): boolean {
  return filePath.split("/").some((segment) => segment.startsWith("_"))
}
