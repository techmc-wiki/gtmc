import type { Root, Element, Text } from "hast"
import { visit } from "unist-util-visit"
import { getSingletonHighlighter, bundledLanguages } from "shiki"

export type RehypeShikiPlugin = Awaited<ReturnType<typeof createRehypeShiki>>

let cachedRehypeShikiPromise: Promise<RehypeShikiPlugin> | null = null

export async function createRehypeShiki() {
  const highlighter = await getSingletonHighlighter({
    themes: ["solarized-light"],
    langs: [...Object.keys(bundledLanguages)],
  })

  return function rehypeShiki() {
    return function (tree: Root): void {
      visit(tree, "element", (node: Element) => {
        if (node.tagName !== "pre") return

        const codeNode = node.children.find(
          (child): child is Element =>
            child.type === "element" && child.tagName === "code"
        )
        if (!codeNode) return

        const classNames = Array.isArray(codeNode.properties?.className)
          ? (codeNode.properties.className as string[])
          : []
        const langClass = classNames.find((c) => c.startsWith("language-"))
        if (!langClass) return

        const lang = langClass.replace("language-", "")
        const rawCode = getTextContent(codeNode)

        try {
          const highlighted = highlighter.codeToHast(rawCode, {
            lang,
            theme: "solarized-light",
          })

          const highlightedPre = highlighted.children.find(
            (c): c is Element => c.type === "element" && c.tagName === "pre"
          )
          if (!highlightedPre) return

          const highlightedCode = highlightedPre.children.find(
            (c): c is Element => c.type === "element" && c.tagName === "code"
          )
          if (!highlightedCode) return

          codeNode.children = highlightedCode.children

          node.properties = node.properties ?? {}
          node.properties["data-raw-code"] = rawCode
          node.properties["data-lang"] = lang
          node.properties["data-line-count"] = String(
            rawCode.split("\n").filter(Boolean).length
          )
        } catch {
          /* unsupported language or highlighting error — leave node untouched */
        }
      })
    }
  }
}

export function getCachedRehypeShiki(): Promise<RehypeShikiPlugin> {
  if (!cachedRehypeShikiPromise) {
    cachedRehypeShikiPromise = createRehypeShiki()
  }

  return cachedRehypeShikiPromise
}

function getTextContent(node: Element | Text): string {
  if (node.type === "text") return node.value
  if (node.type === "element") {
    return (node as Element).children
      .map((child) => {
        if (child.type === "text") return child.value
        if (child.type === "element") return getTextContent(child as Element)
        return ""
      })
      .join("")
  }
  return ""
}
