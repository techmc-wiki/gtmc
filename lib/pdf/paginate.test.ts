import { describe, expect, it } from "vitest"

import { decodePdfDestName, fillTocFolios } from "./paginate"

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
