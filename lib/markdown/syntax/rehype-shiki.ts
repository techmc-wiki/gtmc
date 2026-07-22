import type { Root, Element, Text } from "hast"
import { visit } from "unist-util-visit"
import { createHighlighterCore, type HighlighterCore } from "shiki/core"
import { createJavaScriptRegexEngine } from "shiki/engine/javascript"
import java from "shiki/langs/java.mjs"
import log from "shiki/langs/log.mjs"
import markdown from "shiki/langs/markdown.mjs"
import perl from "shiki/langs/perl.mjs"
import yaml from "shiki/langs/yaml.mjs"
import minDark from "shiki/themes/min-dark.mjs"
import solarizedLight from "shiki/themes/solarized-light.mjs"

export type RehypeShikiPlugin = Awaited<ReturnType<typeof createRehypeShiki>>

const highlightCache = new Map<string, Element | null>()
let pluginPromise: Promise<RehypeShikiPlugin> | null = null
let highlighterPromise: Promise<HighlighterCore> | null = null

function getArticleHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [solarizedLight, minDark],
    langs: [java, yaml, markdown, log, perl],
    engine: createJavaScriptRegexEngine(),
  })
  return highlighterPromise
}

function createNoopRehypeShiki(): RehypeShikiPlugin {
  return function rehypeShiki() {
    return function () {
      return
    }
  }
}

function extractLangsFromMarkdown(content: string): string[] {
  const matches = content.matchAll(/^```(\w+)/gm)
  const langs = new Set<string>()
  for (const match of matches) {
    if (
      match[1] &&
      match[1] !== "text" &&
      match[1] !== "plain" &&
      match[1] !== "mermaid"
    ) {
      langs.add(match[1].toLowerCase())
    }
  }
  return [...langs]
}

export async function createRehypeShiki() {
  const highlighter = await getArticleHighlighter()

  return function rehypeShiki() {
    return function (tree: Root): void {
      visit(tree, "element", (node: Element) => {
        if (node.tagName !== "pre") return

        const codeNode = node.children.find(
          (child): child is Element =>
            child.type === "element" && child.tagName === "code"
        )
        if (!codeNode) return

        const classNames = Array.isArray(codeNode.properties.className)
          ? (codeNode.properties.className as string[])
          : []
        const langClass = classNames.find((c) => c.startsWith("language-"))
        if (!langClass) return

        const lang = langClass.replace("language-", "")
        const rawCode = getTextContent(codeNode)
        const cacheKey = `v3-dual:${lang}:${rawCode}`

        try {
          if (highlightCache.has(cacheKey)) {
            const cached = highlightCache.get(cacheKey)
            if (cached) {
              codeNode.children = cached.children
              node.properties["data-raw-code"] = rawCode
              node.properties["data-lang"] = lang
              node.properties["data-line-count"] = String(
                rawCode.endsWith("\n")
                  ? rawCode.split("\n").length - 1
                  : rawCode.split("\n").length
              )
            }
            return
          }

          const highlighted = highlighter.codeToHast(rawCode, {
            lang,
            themes: {
              light: "solarized-light",
              dark: "min-dark",
            },
            defaultColor: "light",
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
            (child) =>
              !(child.type === "text" && child.value.trim() === "") &&
              !(
                child.type === "element" &&
                (child as Element).tagName === "span" &&
                (child as Element).children.length === 0
              )
          )

          const lastChild = filtered.at(-1)
          if (
            lastChild?.type === "element" &&
            lastChild.tagName === "span" &&
            getTextContent(lastChild).trim() === ""
          ) {
            filtered.pop()
          }

          for (const child of filtered) {
            if (child.type !== "element") continue
            const lineEl = child as Element
            const firstToken = lineEl.children.find(
              (c) => c.type === "element"
            ) as Element | undefined
            const firstText =
              firstToken?.children[0]?.type === "text"
                ? (firstToken.children[0] as Text).value
                : ""
            const leadingSpaces = firstText.match(/^(\s*)/)?.[1] ?? ""
            const indent = [...leadingSpaces].reduce(
              (n, ch) => n + (ch === "\t" ? 4 : 1),
              0
            )
            if (indent > 0) {
              const existing = (lineEl.properties.style as string) ?? ""
              lineEl.properties.style =
                (existing ? existing + ";" : "") + `--line-indent:${indent}ch`
            }
          }

          highlightCache.set(cacheKey, {
            ...highlightedCode,
            children: filtered,
          })

          codeNode.children = filtered

          node.properties["data-raw-code"] = rawCode
          node.properties["data-lang"] = lang
          node.properties["data-line-count"] = String(
            rawCode.endsWith("\n")
              ? rawCode.split("\n").length - 1
              : rawCode.split("\n").length
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
  const langs = content ? extractLangsFromMarkdown(content) : []
  if (langs.length === 0) {
    return Promise.resolve(createNoopRehypeShiki())
  }

  pluginPromise ??= createRehypeShiki()
  return pluginPromise
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
