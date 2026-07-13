import { describe, expect, it } from "vite-plus/test"

import type { LinearizedArticle } from "@/lib/articles/linearize"

import { buildBodyHtml } from "./assemble"
import { buildBookPlan } from "./numbering"
import { renderTocHtml } from "./toc"
import type { BookOptions } from "./types"

function art(overrides: Partial<LinearizedArticle>): LinearizedArticle {
  return {
    slug: "chapter/article",
    title: "Article",
    filePath: "chapter/article.en.md",
    chapterSlug: "chapter",
    chapterTitle: "Chapter",
    folders: [],
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
    folders: [
      { slug: "ch/mechanics", title: "Mechanics & Timing" },
      { slug: "ch/mechanics/signals", title: "Signals <Basics>" },
    ],
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

  it("renders recursive folder headings and escapes their titles", () => {
    const html = renderTocHtml(plan, "en")

    expect(html).toContain("Mechanics &amp; Timing")
    expect(html).toContain("Signals &lt;Basics&gt;")
    expect(html).toContain("toc-depth-3")
  })

  it("shows chapter numbers and localizes the heading", () => {
    expect(renderTocHtml(plan, "en")).toContain("Contents")
    expect(renderTocHtml(plan, "zh")).toContain("目录")
  })

  it("prunes failed renders and renumbers surviving articles without gaps", async () => {
    const recursivePlan = buildBookPlan([
      art({
        slug: 'ch/one"&',
        title: "One",
        folders: [{ slug: "ch/nested", title: "Nested" }],
      }),
      art({
        slug: "ch/two",
        title: "Two",
        folders: [{ slug: "ch/nested", title: "Nested" }],
      }),
      art({ slug: "ch/three", title: "Three" }),
    ])
    const options: BookOptions = {
      title: "Book",
      locale: "en",
      generatedDate: "2026-07-12",
      renderArticle: async (article) =>
        article.slug === "ch/two" ? "" : `<p>${article.title}</p>`,
    }

    const { html, plan: effectivePlan } = await buildBodyHtml(
      options,
      recursivePlan
    )

    expect(
      effectivePlan.chapters[0].content.flatMap((item) =>
        item.kind === "article"
          ? [item.entry.number]
          : item.content.flatMap((child) =>
              child.kind === "article" ? [child.entry.number] : []
            )
      )
    ).toEqual(["1.1", "1.2"])
    expect(html).not.toContain("article-ch/two")
    expect(html).toContain('href="#article-ch/one&quot;&amp;"')
    expect(html).toContain('id="article-ch/one&quot;&amp;"')
  })
})
