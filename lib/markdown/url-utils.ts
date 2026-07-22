const EXPLICIT_SCHEME_RE = /^[A-Za-z][A-Za-z0-9+.-]*:/

export function hasExplicitUrlScheme(value: string): boolean {
  return EXPLICIT_SCHEME_RE.test(value)
}

export function resolveRelativeArticlePath(
  articlePath: string,
  relativePath: string
): string {
  const segments = articlePath.replaceAll("\\", "/").split("/")
  segments.pop()

  for (const segment of relativePath.replaceAll("\\", "/").split("/")) {
    if (!segment || segment === ".") continue
    if (segment === "..") {
      if (segments.length > 0 && segments.at(-1) !== "..") {
        segments.pop()
      } else {
        segments.push(segment)
      }
      continue
    }
    segments.push(segment)
  }

  return segments.filter(Boolean).join("/")
}
