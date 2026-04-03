import type { Root, Heading } from "mdast"
import { visit } from "unist-util-visit"

const ADVANCED_TAG_REGEX = /\[!ADVANCED\]/g

function isAdvancedHeading(node: Root["children"][number]): node is Heading {
  if (node.type !== "heading") return false

  const hProperties = node.data?.hProperties as
    | Record<string, string>
    | undefined

  return hProperties?.["data-advanced"] === "true"
}

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

    const sections: Array<{ start: number; endExclusive: number }> = []

    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i]
      if (!isAdvancedHeading(node)) continue

      const sectionDepth = node.depth
      let endExclusive = tree.children.length

      for (let j = i + 1; j < tree.children.length; j++) {
        const sibling = tree.children[j]
        if (sibling.type === "heading" && sibling.depth <= sectionDepth) {
          endExclusive = j
          break
        }
      }

      sections.push({ start: i, endExclusive })
    }

    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i]

      tree.children.splice(section.endExclusive, 0, {
        type: "html",
        value: "</div>",
      } as Root["children"][number])

      tree.children.splice(section.start, 0, {
        type: "html",
        value: '<div data-advanced-section="true">',
      } as Root["children"][number])
    }
  }
}
