import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkBreaks from "remark-breaks"
import rehypeRaw from "rehype-raw"
import rehypeKatex from "rehype-katex"
import rehypeSlug from "rehype-slug"
import type { Element, Root, Text } from "hast"
import { visit } from "unist-util-visit"
import { pangu } from "pangu"
import { remarkAnsiColors } from "@/lib/markdown/plugins/remark-ansi-colors"
import { remarkCallouts } from "@/lib/markdown/plugins/remark-callouts"
import { remarkAdvancedSections } from "@/lib/markdown/plugins/remark-advanced-sections"
import { remarkNumberedHeadingsDot } from "@/lib/markdown/plugins/remark-heading-numbering"
import { rehypeAdvancedSections } from "@/lib/markdown/plugins/rehype-advanced-sections"
import type { createRehypeShiki } from "@/lib/markdown/plugins/rehype-shiki"

export function rehypeLinkedCode() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "a") {
        const codeChild = node.children?.some(
          (c) => c.type === "element" && (c as Element).tagName === "code"
        )
        if (codeChild) {
          node.properties = node.properties || {}
          node.properties["data-has-code"] = "true"
          node.children?.forEach((c) => {
            if (c.type === "element" && (c as Element).tagName === "code") {
              ;(c as Element).properties = (c as Element).properties || {}
              ;(c as Element).properties["data-linked-code"] = "true"
            }
          })
        }
      }
      if (node.tagName === "code") {
        const linkChild = node.children?.some(
          (c) => c.type === "element" && (c as Element).tagName === "a"
        )
        if (linkChild) {
          node.properties = node.properties || {}
          node.properties["data-has-link"] = "true"
          node.children?.forEach((c) => {
            if (c.type === "element" && (c as Element).tagName === "a") {
              ;(c as Element).properties = (c as Element).properties || {}
              ;(c as Element).properties["data-in-code"] = "true"
            }
          })
        }
      }
    })
  }
}

export function rehypeCJKSpacing() {
  return (tree: Root) => {
    visit(tree, (node, _, parent) => {
      if (node.type !== "text") return
      if (parent?.type === "element") {
        const parentTag = (parent as Element).tagName
        if (parentTag === "code" || parentTag === "pre") return
      }
      const textNode = node as Text
      textNode.value = pangu.spacingText(textNode.value)
    })
  }
}

export function getPluginsForContent(
  content: string,
  rehypeShikiPlugin?: Awaited<ReturnType<typeof createRehypeShiki>>
) {
  const remarkPlugins: Array<
    | typeof remarkGfm
    | typeof remarkMath
    | typeof remarkBreaks
    | typeof remarkAnsiColors
    | typeof remarkCallouts
    | typeof remarkAdvancedSections
    | [typeof remarkNumberedHeadingsDot, { startDepth: number }]
  > = [
    remarkGfm,
    remarkBreaks,
    remarkAnsiColors,
    remarkCallouts,
    remarkAdvancedSections,
    [remarkNumberedHeadingsDot, { startDepth: 2 }],
  ]

  const rehypePlugins: Array<
    | typeof rehypeRaw
    | typeof rehypeAdvancedSections
    | typeof rehypeKatex
    | typeof rehypeSlug
    | typeof rehypeCJKSpacing
    | typeof rehypeLinkedCode
    | Awaited<ReturnType<typeof createRehypeShiki>>
  > = [rehypeRaw, rehypeAdvancedSections, rehypeLinkedCode, rehypeSlug]

  if (
    content.includes("$") ||
    content.includes("\\(") ||
    content.includes("\\[")
  ) {
    remarkPlugins.push(remarkMath)
    rehypePlugins.splice(2, 0, rehypeKatex)
  }

  if (rehypeShikiPlugin) rehypePlugins.push(rehypeShikiPlugin)
  rehypePlugins.push(rehypeCJKSpacing)

  return { remarkPlugins, rehypePlugins }
}
