import type { Root, Blockquote, Paragraph, Text } from "mdast"
import { visit } from "unist-util-visit"

const CALLOUT_MARKER_REGEX =
  /^\s*\[!(WARNING|TIP|IMPORTANT|CRASH|CORRUPTION)\]\s*/i

export function remarkCallouts() {
  return (tree: Root) => {
    if (!tree || !tree.children) return

    visit(tree, "blockquote", (node: Blockquote) => {
      if (!node.children || node.children.length === 0) return
      const firstChild = node.children[0]
      if (firstChild.type !== "paragraph") return

      const paragraph = firstChild as Paragraph
      if (!paragraph.children || paragraph.children.length === 0) return

      const firstTextChild = paragraph.children[0]
      if (firstTextChild.type !== "text") return

      const textNode = firstTextChild as Text
      const match = textNode.value.match(CALLOUT_MARKER_REGEX)
      if (!match) return

      const calloutType = match[1].toLowerCase()

      textNode.value = textNode.value.replace(CALLOUT_MARKER_REGEX, "")
      if (textNode.value.length === 0) {
        paragraph.children.shift()
      }

      if (
        paragraph.children.length > 0 &&
        paragraph.children[0].type === "break"
      ) {
        paragraph.children.shift()
      }

      if (paragraph.children.length === 0) {
        node.children.shift()
      }

      // Strip trailing break node inserted by remarkBreaks after the marker
      if (
        paragraph.children.length > 0 &&
        paragraph.children[0].type === "break"
      ) {
        paragraph.children.shift()
      }

      // Remove paragraph entirely if now empty
      if (paragraph.children.length === 0) {
        node.children.shift()
      }

      let isBodyEmpty = true
      for (const child of node.children) {
        if (child.type === "paragraph") {
          for (const textChild of (child as Paragraph).children) {
            if (textChild.type === "text") {
              const text = (textChild as Text).value.trim()
              if (text.length > 0) {
                isBodyEmpty = false
                break
              }
            }
          }
        } else {
          isBodyEmpty = false
          break
        }
        if (!isBodyEmpty) break
      }

      node.data = node.data ?? {}
      node.data.hName = "aside"
      node.data.hProperties = {
        ...(node.data.hProperties ?? {}),
        "data-callout": calloutType,
      }

      if (isBodyEmpty) {
        node.data.hProperties["data-callout-empty"] = "true"
      }
    })
  }
}
