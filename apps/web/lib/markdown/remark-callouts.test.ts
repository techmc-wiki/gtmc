import type { Element, Root, Text } from "hast"
import { visit } from "unist-util-visit"
import { describe, expect, test } from "vite-plus/test"

import { renderMarkdownToHast } from "@gtmc/ssg/markdown/pdf-hast"
import {
  createRehypeShiki,
  type RehypeShikiPlugin,
} from "@gtmc/ssg/markdown/syntax/rehype-shiki"

let shikiPlugin: RehypeShikiPlugin | undefined

async function render(markdown: string): Promise<Root> {
  const plugin = (shikiPlugin ??= await createRehypeShiki())
  return renderMarkdownToHast(markdown, {
    articleSlug: "remark-callouts-test",
    locale: "en",
    shikiPlugin: plugin,
  })
}

function findElement(root: Root, tagName: string): Element | undefined {
  let match: Element | undefined
  visit(root, "element", (node: Element) => {
    if (!match && node.tagName === tagName) {
      match = node
    }
  })
  return match
}

function childElements(node: Element, tagName: string): Element[] {
  return node.children.filter(
    (child): child is Element =>
      child.type === "element" && child.tagName === tagName
  )
}

function textContent(node: Root | Element): string {
  let text = ""
  visit(node, "text", (child: Text) => {
    text += child.value
  })
  return text
}

describe("remarkCallouts", () => {
  test("keeps the heading and paragraph after a marker-only callout", async () => {
    const root = await render("> [!WARNING]\n> ## Heading\n> Paragraph text.\n")
    const aside = findElement(root, "aside")

    expect(aside?.properties.dataCallout).toBe("warning")
    expect(aside?.properties.dataCalloutEmpty).toBeUndefined()

    const headings = aside ? childElements(aside, "h2") : []
    const paragraphs = aside ? childElements(aside, "p") : []

    expect(headings).toHaveLength(1)
    expect(textContent(headings[0])).toContain("Heading")
    expect(paragraphs).toHaveLength(1)
    expect(textContent(paragraphs[0])).toBe("Paragraph text.")
  })

  test("renders an empty callout without a body", async () => {
    const root = await render("> [!TIP]\n")
    const aside = findElement(root, "aside")

    expect(aside?.properties.dataCallout).toBe("tip")
    expect(aside?.properties.dataCalloutEmpty).toBe("true")

    const nestedElements =
      aside?.children.filter((child) => child.type === "element") ?? []
    expect(nestedElements).toEqual([])
  })
})
