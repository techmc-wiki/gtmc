import type { Root, Heading } from "mdast"
import { visit } from "unist-util-visit"

const ADVANCED_TAG_REGEX = /\[!ADVANCED\]/g

export function remarkAdvancedSections() {
  return (tree: Root) => {
    if (!tree || !tree.children) return

    visit(tree, "heading", (node: Heading) => {
      let hasAdvancedTag = false

      node.children.forEach((child) => {
        if (child.type !== "text") return

        const nextValue = child.value.replace(ADVANCED_TAG_REGEX, "")
        if (nextValue !== child.value) hasAdvancedTag = true
        child.value = nextValue
      })

      if (!hasAdvancedTag) return

      node.data = node.data ?? {}
      node.data.hProperties = {
        ...(node.data.hProperties ?? {}),
        "data-advanced": "true",
      }
    })
  }
}
