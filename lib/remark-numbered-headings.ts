import type { Root, Heading } from "mdast"
import { visit } from "unist-util-visit"

interface Options {
  startDepth?: number
  prefix?: string
  skipLevels?: number[]
}

export function remarkNumberedHeadingsDot(options?: Options) {
  const { startDepth = 2, prefix = "", skipLevels = [] } = options ?? {}

  return (tree: Root) => {
    if (!tree || !tree.children) return

    const counters: number[] = []

    visit(tree, "heading", (node: Heading) => {
      const counterIndex = node.depth - startDepth

      if (counterIndex < 0 || skipLevels.includes(node.depth)) {
        return
      }

      let textNode = node.children[0]
      if (!textNode || textNode.type !== "text") {
        textNode = { type: "text", value: "" }
        node.children.unshift(textNode)
      }

      const text = (textNode as { value: string }).value.replace(
        /^([0-9.\-])+ /,
        ""
      )

      const length = counterIndex + 1
      while (counters.length > length) counters.pop()

      if (counters.length === length) {
        counters[counterIndex]++
      } else {
        while (counters.length < length) counters.push(1)
      }

      ;(textNode as { value: string }).value =
        `${prefix}${counters.join(".")} ${text}`
    })
  }
}
