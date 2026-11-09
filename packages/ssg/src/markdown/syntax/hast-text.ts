import type { Element, Text } from "hast"

/** Concatenate the text descendants of a HAST node. */
export function getHastText(node: Element | Text): string {
  if (node.type === "text") return node.value

  return node.children
    .map((child) => {
      if (child.type === "text") return child.value
      if (child.type === "element") return getHastText(child)
      return ""
    })
    .join("")
}
