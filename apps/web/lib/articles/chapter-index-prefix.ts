export function formatIndexPrefix(
  index: number,
  isAppendix: boolean,
  isPreface: boolean
): string {
  if (isPreface || index === -1) {
    return ""
  }

  if (isAppendix) {
    if (index < 1 || index > 26) {
      return ""
    }
    return String.fromCharCode(64 + index) + ". "
  }

  return String(index).padStart(2, "0") + " "
}
