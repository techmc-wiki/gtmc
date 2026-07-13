import { describe, expect, it } from "vite-plus/test"

import {
  decodePdfDestName,
  fillTocFolios,
  haveTocFolioPagesChanged,
} from "./paginate"

describe("decodePdfDestName", () => {
  it("decodes #-escaped bytes in PDF names", () => {
    expect(
      decodePdfDestName("/article-block-update#2Fcontinuous-updates")
    ).toBe("article-block-update/continuous-updates")
  })

  it("returns plain names unchanged (without leading slash)", () => {
    expect(decodePdfDestName("/article-preface")).toBe("article-preface")
  })
})

describe("fillTocFolios", () => {
  it("replaces folio placeholders with 1-based page numbers", () => {
    const html =
      '<span class="toc-folio" data-anchor="article-ch/a"></span>' +
      '<span class="toc-folio" data-anchor="article-ch/b"></span>'
    const pages = new Map([
      ["article-ch/a", 4],
      ["article-ch/b", 9],
    ])

    const result = fillTocFolios(html, pages)

    expect(result.html).toContain(">5<")
    expect(result.html).toContain(">10<")
    expect(result.missing).toEqual([])
  })

  it("reports anchors missing from the page map and leaves them blank", () => {
    const html = '<span class="toc-folio" data-anchor="article-gone"></span>'

    const result = fillTocFolios(html, new Map())

    expect(result.missing).toEqual(["article-gone"])
    expect(result.html).not.toContain("undefined")
  })
})

describe("haveTocFolioPagesChanged", () => {
  const html =
    '<span class="toc-folio" data-anchor="chapter-main"></span>' +
    '<span class="toc-folio" data-anchor="article-ch/a&amp;b"></span>'

  it("detects a changed page for a TOC folio target", () => {
    const insertedPages = new Map([
      ["chapter-main", 2],
      ["article-ch/a&b", 3],
    ])
    const measuredPages = new Map([
      ["chapter-main", 2],
      ["article-ch/a&b", 4],
    ])

    expect(haveTocFolioPagesChanged(html, insertedPages, measuredPages)).toBe(
      true
    )
  })

  it("ignores changed anchors that are not TOC folio targets", () => {
    const insertedPages = new Map([
      ["chapter-main", 2],
      ["article-ch/a&b", 3],
      ["article-unlisted", 8],
    ])
    const measuredPages = new Map([
      ["chapter-main", 2],
      ["article-ch/a&b", 3],
      ["article-unlisted", 9],
    ])

    expect(haveTocFolioPagesChanged(html, insertedPages, measuredPages)).toBe(
      false
    )
  })
})
