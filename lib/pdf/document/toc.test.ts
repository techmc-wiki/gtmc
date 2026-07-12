import { describe, expect, it } from "vitest"

import type { LinearizedArticle } from "@/lib/articles/linearize"

import { buildBookPlan } from "./numbering"
import { renderTocHtml } from "./toc"

function art(overrides: Partial<LinearizedArticle>): LinearizedArticle {
  return {
    slug: "chapter/article",
    title: "Article",
    filePath: "chapter/article.en.md",
    chapterSlug: "chapter",
    chapterTitle: "Chapter",
    isPreface: false,
    isAppendix: false,
    isAdvanced: false,
    isReadmeIntro: false,
    index: -1,
    depth: 0,
    ...overrides,
  }
}

const plan = buildBookPlan([
  art({ slug: "preface", title: "Preface", isPreface: true, chapterSlug: "" }),
  art({
    slug: "ch/a",
    chapterSlug: "ch",
    chapterTitle: "Blocks",
    title: "A & B",
  }),
  art({
    slug: "appendix/glossary",
    chapterSlug: "appendix",
    chapterTitle: "Appendix",
    title: "Glossary",
    isAppendix: true,
  }),
])

describe("renderTocHtml", () => {
  it("links every article to its anchor with a folio placeholder", () => {
    const html = renderTocHtml(plan, "en")

    expect(html).toContain('href="#article-ch/a"')
    expect(html).toContain('data-anchor="article-ch/a"')
    expect(html).toContain('class="toc-folio"')
  })

  it("escapes article titles", () => {
    const html = renderTocHtml(plan, "en")
    expect(html).toContain("A &amp; B")
    expect(html).not.toContain("A & B<")
  })

  it("shows chapter numbers and localizes the heading", () => {
    expect(renderTocHtml(plan, "en")).toContain("Contents")
    expect(renderTocHtml(plan, "zh")).toContain("目录")
  })
})
