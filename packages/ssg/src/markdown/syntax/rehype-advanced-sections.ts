import type { Element, ElementContent, Root } from "hast"
import { visit } from "unist-util-visit"

function getHeadingDepth(node: ElementContent): number | null {
  if (node.type !== "element") return null

  const match = node.tagName.match(/^h([1-6])$/)
  return match ? Number.parseInt(match[1], 10) : null
}

function isAdvancedHeading(node: ElementContent): node is Element {
  if (node.type !== "element") return false

  const headingDepth = getHeadingDepth(node)
  if (headingDepth === null) return false

  const dataAdvanced =
    node.properties["data-advanced"] ?? node.properties.dataAdvanced

  return dataAdvanced === "true" || dataAdvanced === true
}

function wrapAdvancedSections(children: ElementContent[]) {
  const result: ElementContent[] = []

  for (let i = 0; i < children.length; i++) {
    const node = children[i]
    if (!isAdvancedHeading(node)) {
      result.push(node)
      continue
    }

    const sectionDepth = getHeadingDepth(node)
    if (sectionDepth === null) continue

    let endExclusive = children.length

    for (let j = i + 1; j < children.length; j++) {
      const siblingDepth = getHeadingDepth(children[j])
      if (siblingDepth !== null && siblingDepth <= sectionDepth) {
        endExclusive = j
        break
      }
    }

    result.push({
      type: "element",
      tagName: "div",
      properties: {
        "data-advanced-section": "true",
        "data-advanced-heading": node.properties.id,
      },
      children: children.slice(i, endExclusive),
    })

    // A deeper advanced heading already belongs to this deep dive. Consuming
    // the range once preserves sibling boundaries and avoids nested chrome.
    i = endExclusive - 1
  }

  children.splice(0, children.length, ...result)
}

export function rehypeAdvancedSections() {
  return (tree: Root) => {
    visit(tree, "root", (node: Root) => {
      if (!Array.isArray(node.children) || node.children.length === 0) return

      wrapAdvancedSections(node.children as ElementContent[])
    })
  }
}
