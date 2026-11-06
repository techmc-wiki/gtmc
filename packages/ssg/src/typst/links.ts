import { safeDecode } from "./escape"

export type LinkTarget =
  | { readonly kind: "anchor"; readonly id: string }
  | { readonly kind: "article"; readonly id: string }
  | { readonly kind: "external"; readonly url: string }
  | { readonly kind: "text" }

const SCHEME = /^[a-z][a-z0-9+.-]*:/i

/** `#…` anchors and http(s) URLs are decided here; other hrefs go to the driver's resolver. */
export function classifyHref(
  href: string,
  resolve: (href: string) => string | null
): LinkTarget {
  if (href.startsWith("#"))
    return { kind: "anchor", id: safeDecode(href.slice(1)) }
  if (/^https?:\/\//i.test(href)) return { kind: "external", url: href }
  if (SCHEME.test(href)) return { kind: "text" }
  const id = resolve(href)
  return id === null ? { kind: "text" } : { kind: "article", id }
}
