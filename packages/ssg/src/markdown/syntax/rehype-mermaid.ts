import type { Element, Parent, Root } from "hast"
import { SKIP, visit } from "unist-util-visit"

import { getHastText } from "./hast-text"

export const MERMAID_DIAGRAM_TAG = "mermaid-diagram"

export function rehypeMermaid() {
  return (tree: Root): void => {
    visit(
      tree,
      "element",
      (node: Element, index, parent: Parent | undefined) => {
        if (node.tagName !== "pre" || index === undefined || !parent) return

        const codeNode = node.children.find(
          (child): child is Element =>
            child.type === "element" && child.tagName === "code"
        )
        if (!codeNode || !isMermaidCode(codeNode)) return

        parent.children[index] = {
          type: "element",
          tagName: MERMAID_DIAGRAM_TAG,
          properties: { "data-mermaid-diagram": true },
          children: [{ type: "text", value: getHastText(codeNode) }],
        }

        return [SKIP, index]
      }
    )
  }
}

function isMermaidCode(node: Element): boolean {
  const classNames = Array.isArray(node.properties.className)
    ? node.properties.className
    : []

  return classNames.includes("language-mermaid")
}
