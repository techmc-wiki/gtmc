import type { Element, Root, Text } from "hast"
import { visit } from "unist-util-visit"
import { pangu } from "pangu"

/**
 * Rehype plugin that adds spacing between CJK and half-width characters
 * using pangu.js. Skips text inside code and pre elements.
 */
export function rehypeCJKSpacing() {
  return (tree: Root) => {
    visit(tree, (node, _, parent) => {
      if (node.type !== "text") return
      if (parent?.type === "element") {
        const parentTag = (parent as Element).tagName
        if (parentTag === "code" || parentTag === "pre") return
      }
      const textNode = node as Text
      textNode.value = pangu.spacingText(textNode.value)
    })
  }
}
