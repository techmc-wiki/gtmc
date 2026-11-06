import type { Element, Root } from "hast"

import { attr, textOf, walkElements } from "./hast"

export interface CollectedAssets {
  images: string[]
  mermaid: string[]
}

/** Raw `img` sources and mermaid sources in document order, deduplicated. */
export function collectAssets(root: Root): CollectedAssets {
  const images = new Set<string>()
  const mermaid = new Set<string>()
  walkElements(root, (el: Element) => {
    if (el.tagName === "img") {
      const src = attr(el, "src")
      if (src !== undefined) images.add(src)
    }
    // rehype-mermaid stores the diagram source as the text of `mermaid-diagram`.
    if (el.tagName === "mermaid-diagram") mermaid.add(textOf(el))
  })
  return { images: [...images], mermaid: [...mermaid] }
}
