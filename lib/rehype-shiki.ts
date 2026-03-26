import type { Root, Element, Text } from "hast"
import { visit } from "unist-util-visit"
import { getSingletonHighlighter } from "shiki"

export type RehypeShikiPlugin = Awaited<ReturnType<typeof createRehypeShiki>>

const highlightCache = new Map<string, Element | null>()

function extractLangsFromMarkdown(content: string): string[] {
  const matches = content.matchAll(/^```(\w+)/gm)
  const langs = new Set<string>()
  for (const match of matches) {
    if (match[1] && match[1] !== "text" && match[1] !== "plain") {
      langs.add(match[1].toLowerCase())
    }
  }
  return [...langs]
}

export async function createRehypeShiki(langs?: string[]) {
  const langsToLoad = langs && langs.length > 0 ? langs : ["javascript"]
  const highlighter = await getSingletonHighlighter({
    themes: ["solarized-light"],
    langs: langsToLoad,
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
        const cacheKey = `${lang}:${rawCode}`

        try {
          if (highlightCache.has(cacheKey)) {
            const cached = highlightCache.get(cacheKey)
            if (cached) {
              codeNode.children = cached.children
              node.properties = node.properties ?? {}
              node.properties["data-raw-code"] = rawCode
              node.properties["data-lang"] = lang
              node.properties["data-line-count"] = String(
                rawCode.split("\n").filter(Boolean).length
              )
            }
            return
          }

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

          const filtered = highlightedCode.children.filter(
            (child) => !(child.type === "text" && child.value.trim() === "")
          )

          highlightCache.set(cacheKey, {
            ...highlightedCode,
            children: filtered,
          })

          codeNode.children = filtered

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

export function getCachedRehypeShiki(
  content?: string
): Promise<RehypeShikiPlugin> {
  const langs = content ? extractLangsFromMarkdown(content) : undefined
  return createRehypeShiki(langs)
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
