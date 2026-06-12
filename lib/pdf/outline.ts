import type { PDFDict, PDFDocument } from "pdf-lib"
import { PDFName } from "pdf-lib"

import type { LinearizedArticle } from "@/lib/articles/linearize"

export interface OutlineNode {
  title: string
  pageIndex: number
  children: OutlineNode[]
}

interface TreeNode {
  children: TreeNode[]
}

function countTreeItems(items: TreeNode[]): number {
  let c = items.length
  for (const item of items) c += countTreeItems(item.children)
  return c
}

/**
 * Build a hierarchical outline tree from the linearized articles.
 *
 * Page indices are sequential estimates (cover=0, toc=1, then each section
 * gets the next integer). Actual page numbers depend on content length, so
 * these are best-effort approximations.
 */
export function buildOutlineTree(articles: LinearizedArticle[]): OutlineNode[] {
  const root: OutlineNode[] = []

  // Cover → page 0, TOC → page 1, content starts at page 2
  let nextPage = 2

  // ── Preface articles (no chapter grouping) ──────────────────────────────
  for (const article of articles) {
    if (!article.isPreface) continue
    root.push({
      title: article.title,
      pageIndex: nextPage++,
      children: [],
    })
  }

  // ── Group remaining articles by chapter ─────────────────────────────────
  const chapters = new Map<
    string,
    { title: string; articles: LinearizedArticle[] }
  >()
  for (const article of articles) {
    if (article.isPreface || !article.chapterSlug) continue

    let chapter = chapters.get(article.chapterSlug)
    if (!chapter) {
      chapter = { title: article.chapterTitle, articles: [] }
      chapters.set(article.chapterSlug, chapter)
    }
    chapter.articles.push(article)
  }

  for (const [, chapter] of chapters) {
    const entry: OutlineNode = {
      title: chapter.title,
      pageIndex: nextPage++,
      children: [],
    }

    for (const article of chapter.articles) {
      entry.children.push({
        title: article.title,
        pageIndex: nextPage++,
        children: [],
      })
    }

    root.push(entry)
  }

  return root
}

/**
 * Write PDF outline items (bookmarks) into the document using low-level
 * pdf-lib API calls.
 *
 * Structure:
 *   Catalog → /Outlines (root dict)
 *   Root dict → /First → top-level item, /Last → top-level item
 *   Each item: { /Title, /Parent, /Dest, /First, /Last (if children), /Next, /Prev }
 *
 * @param pdfDoc   The loaded PDFDocument (from pdf-lib)
 * @param tree     Hierarchical outline tree with titles and estimated page indices
 */
export function writePdfOutlines(
  pdfDoc: PDFDocument,
  tree: OutlineNode[]
): void {
  const context = pdfDoc.context
  const pages = pdfDoc.getPages()
  if (pages.length === 0 || tree.length === 0) return

  // Helper: clamp page index into valid range
  const clampPage = (idx: number): number =>
    Math.max(0, Math.min(idx, pages.length - 1))

  // Helper: build a destination array [pageRef /Fit]
  const makeDest = (pageIdx: number): ReturnType<typeof context.obj> =>
    context.obj([pages[clampPage(pageIdx)].ref, PDFName.of("Fit")])

  // ── Phase 1: Build refs, create all dicts ───────────────────────────────
  // We structure the data so we can link siblings after creation.

  interface ItemData {
    ref: ReturnType<typeof context.nextRef>
    dict: PDFDict
    children: ItemData[]
  }

  function buildItem(
    node: OutlineNode,
    parentRef: ReturnType<typeof context.nextRef>
  ): ItemData {
    const ref = context.nextRef()
    const dest = makeDest(node.pageIndex)
    const dict = context.obj({
      Title: node.title,
      Parent: parentRef,
      Dest: dest,
    })

    const item: ItemData = { ref, dict, children: [] }

    // Build children recursively
    for (const child of node.children) {
      item.children.push(buildItem(child, ref))
    }

    // Link children on parent dict
    if (item.children.length > 0) {
      dict.set(PDFName.of("First"), item.children[0].ref)
      dict.set(PDFName.of("Last"), item.children[item.children.length - 1].ref)
      // Count = number of children (positive = open)
      dict.set(PDFName.of("Count"), context.obj(item.children.length))
    }

    return item
  }

  const rootRef = context.nextRef()
  const topLevelItems: ItemData[] = tree.map((node) => buildItem(node, rootRef))

  // Link top-level siblings
  for (let i = 0; i < topLevelItems.length; i++) {
    const dict = topLevelItems[i].dict
    if (i > 0) dict.set(PDFName.of("Prev"), topLevelItems[i - 1].ref)
    if (i < topLevelItems.length - 1) {
      dict.set(PDFName.of("Next"), topLevelItems[i + 1].ref)
    }
  }

  // Link children within each parent
  for (const top of topLevelItems) {
    for (let i = 0; i < top.children.length; i++) {
      const dict = top.children[i].dict
      if (i > 0) dict.set(PDFName.of("Prev"), top.children[i - 1].ref)
      if (i < top.children.length - 1) {
        dict.set(PDFName.of("Next"), top.children[i + 1].ref)
      }
    }
  }

  // ── Phase 2: Assign refs to their dicts ───────────────────────────────
  function assignItem(item: ItemData): void {
    context.assign(item.ref, item.dict)
    for (const child of item.children) assignItem(child)
  }
  for (const item of topLevelItems) assignItem(item)

  // ── Phase 3: Create root Outlines dict ─────────────────────────────────
  // Total count = top-level items + all children
  const totalCount = countTreeItems(topLevelItems)

  const rootDict = context.obj({
    Type: PDFName.of("Outlines"),
    First: topLevelItems[0].ref,
    Last: topLevelItems[topLevelItems.length - 1].ref,
    Count: totalCount,
  })

  context.assign(rootRef, rootDict)

  // ── Phase 4: Link root into document catalog ──────────────────────────
  pdfDoc.catalog.set(PDFName.of("Outlines"), rootRef)
}
