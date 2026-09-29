import type { Element, Root, Text } from "hast"
import { visit } from "unist-util-visit"

type SpacingText = (text: string) => string

/** Supply Pangu from an environment-specific entrypoint so browser bundles omit its Node filesystem helpers. */
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
