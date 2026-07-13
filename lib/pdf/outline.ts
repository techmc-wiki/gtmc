/**
 * PDF outline (bookmark) writer.
 *
 * Builds the outline hierarchy from the book plan and the anchor→page map
 * measured from the rendered PDF (see paginate.ts), so every bookmark lands
 * on the exact page — no estimated indices.
 */

import type { PDFDict, PDFDocument, PDFRef } from "pdf-lib"
import { PDFHexString, PDFName } from "pdf-lib"

import type { BookPlan, ChapterContent, PdfLocale } from "./document/types"
import { formatChapterLabel } from "./document/labels"

interface OutlineItemData {
  ref: PDFRef
  dict: PDFDict
  children: OutlineItemData[]
}

function linkSiblings(items: OutlineItemData[]): void {
  for (let i = 0; i < items.length; i++) {
    if (i > 0) items[i].dict.set(PDFName.of("Prev"), items[i - 1].ref)
    if (i < items.length - 1) {
      items[i].dict.set(PDFName.of("Next"), items[i + 1].ref)
    }
  }
}

export interface OutlineNode {
  title: string
  pageIndex: number
  children: OutlineNode[]
}

/**
 * Build the outline tree from the book plan using measured page indices.
 *
 * @param plan        Numbered book plan
 * @param anchorPages Map of anchor id → 0-based page index in the body PDF
 * @param locale      Locale for chapter designations
 * @param pageOffset  Pages inserted before the body (e.g. the merged cover)
 * @param tocTitle    Localized TOC bookmark title (TOC sits on body page 0)
 */
export function buildOutlineTree(
  plan: BookPlan,
  anchorPages: Map<string, number>,
  locale: PdfLocale,
  pageOffset: number,
  tocTitle: string
): OutlineNode[] {
  const root: OutlineNode[] = []
  const pageOf = (anchor: string): number | undefined => {
    const index = anchorPages.get(anchor)
    return index === undefined ? undefined : index + pageOffset
  }

  root.push({ title: tocTitle, pageIndex: pageOffset, children: [] })

  for (const entry of plan.preface) {
    const pageIndex = pageOf(`article-${entry.article.slug}`)
    if (pageIndex === undefined) continue
    root.push({ title: entry.article.title, pageIndex, children: [] })
  }

  for (const chapter of plan.chapters) {
    const chapterPage = pageOf(`chapter-${chapter.slug}`)
    if (chapterPage === undefined) continue

    const node: OutlineNode = {
      title: `${formatChapterLabel(locale, chapter.number, chapter.isAppendix)} — ${chapter.title}`,
      pageIndex: chapterPage,
      children: [],
    }

    function outlineContent(content: ChapterContent[]): OutlineNode[] {
      const children: OutlineNode[] = []

      for (const item of content) {
        if (item.kind === "article") {
          const pageIndex = pageOf(`article-${item.entry.article.slug}`)
          if (pageIndex !== undefined) {
            const prefix = item.entry.number ? `${item.entry.number}  ` : ""
            children.push({
              title: `${prefix}${item.entry.article.title}`,
              pageIndex,
              children: [],
            })
          }
          continue
        }

        const nested = outlineContent(item.content)
        const firstDescendant = nested[0]
        if (firstDescendant) {
          children.push({
            title: item.title,
            pageIndex: firstDescendant.pageIndex,
            children: nested,
          })
        }
      }

      return children
    }

    node.children.push(...outlineContent(chapter.content))

    root.push(node)
  }

  return root
}

/**
 * Write outline items (bookmarks) into the document using low-level
 * pdf-lib calls. Supports arbitrary nesting depth.
 */
export function writePdfOutlines(
  pdfDoc: PDFDocument,
  tree: OutlineNode[]
): void {
  const context = pdfDoc.context
  const pages = pdfDoc.getPages()
  if (pages.length === 0 || tree.length === 0) return

  const clampPage = (index: number): number =>
    Math.max(0, Math.min(index, pages.length - 1))

  const makeDest = (pageIndex: number): ReturnType<typeof context.obj> =>
    context.obj([pages[clampPage(pageIndex)].ref, PDFName.of("Fit")])

  let totalCount = 0

  function buildItem(node: OutlineNode, parentRef: PDFRef): OutlineItemData {
    totalCount++
    const ref = context.nextRef()
    // PDFHexString (UTF-16BE): context.obj() would coerce a plain string
    // into a PDFName, which mangles spaces and CJK titles in viewers.
    const dict = context.obj({
      Title: PDFHexString.fromText(node.title),
      Parent: parentRef,
      Dest: makeDest(node.pageIndex),
    })

    const item: OutlineItemData = { ref, dict, children: [] }
    for (const child of node.children) {
      item.children.push(buildItem(child, ref))
    }

    linkSiblings(item.children)
    if (item.children.length > 0) {
      dict.set(PDFName.of("First"), item.children[0].ref)
      dict.set(PDFName.of("Last"), item.children[item.children.length - 1].ref)
      // Negative count = children collapsed by default in viewers
      dict.set(PDFName.of("Count"), context.obj(-item.children.length))
    }

    return item
  }

  function assignItem(item: OutlineItemData): void {
    context.assign(item.ref, item.dict)
    for (const child of item.children) assignItem(child)
  }

  const rootRef = context.nextRef()
  const topLevel = tree.map((node) => buildItem(node, rootRef))
  linkSiblings(topLevel)
  for (const item of topLevel) assignItem(item)

  const rootDict = context.obj({
    Type: PDFName.of("Outlines"),
    First: topLevel[0].ref,
    Last: topLevel[topLevel.length - 1].ref,
    Count: totalCount,
  })
  context.assign(rootRef, rootDict)
  pdfDoc.catalog.set(PDFName.of("Outlines"), rootRef)
}
