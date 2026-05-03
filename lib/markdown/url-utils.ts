const EXPLICIT_SCHEME_RE = /^[A-Za-z][A-Za-z0-9+.-]*:/

export function hasExplicitUrlScheme(value: string): boolean {
  return EXPLICIT_SCHEME_RE.test(value)
}
