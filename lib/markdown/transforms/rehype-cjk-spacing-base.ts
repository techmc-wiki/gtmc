import type { Element, Root, Text } from "hast"
import { visit } from "unist-util-visit"

type SpacingText = (text: string) => string

/**
 * Build a Rehype transform that adds spacing between CJK and half-width text.
 *
 * The spacing implementation is supplied by an environment-specific Pangu
 * entrypoint so browser bundles never include its Node filesystem helpers.
 */
export function createRehypeCJKSpacing(spacingText: SpacingText) {
  return () => (tree: Root) => {
    visit(tree, (node, _, parent) => {
      if (node.type !== "text") return
      if (parent?.type === "element") {
        const parentTag = (parent as Element).tagName
        if (
          parentTag === "code" ||
          parentTag === "pre" ||
          parentTag === "mermaid-diagram"
        ) {
          return
        }
      }
      const textNode = node as Text
      textNode.value = spacingText(textNode.value)
    })
  }
}
