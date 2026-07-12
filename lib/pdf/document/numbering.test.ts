import { describe, expect, it } from "vitest"

import type { LinearizedArticle } from "@/lib/articles/linearize"

import { buildBookPlan } from "./numbering"

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

describe("buildBookPlan", () => {
  it("separates preface articles and leaves them unnumbered", () => {
    const plan = buildBookPlan([
      art({
        slug: "preface",
        title: "Preface",
        isPreface: true,
        chapterSlug: "",
      }),
      art({ slug: "ch/a", chapterSlug: "ch", chapterTitle: "Ch" }),
    ])

    expect(plan.preface).toHaveLength(1)
    expect(plan.preface[0].number).toBeNull()
    expect(plan.chapters).toHaveLength(1)
  })

  it("numbers chapters 1..N and articles N.M in linear order", () => {
    const plan = buildBookPlan([
      art({
        slug: "alpha/x",
        chapterSlug: "alpha",
        chapterTitle: "Alpha",
        title: "X",
      }),
      art({
        slug: "alpha/y",
        chapterSlug: "alpha",
        chapterTitle: "Alpha",
        title: "Y",
      }),
      art({
        slug: "beta/z",
        chapterSlug: "beta",
        chapterTitle: "Beta",
        title: "Z",
      }),
    ])

    expect(plan.chapters.map((c) => c.number)).toEqual(["1", "2"])
    expect(plan.chapters[0].articles.map((a) => a.number)).toEqual([
      "1.1",
      "1.2",
    ])
    expect(plan.chapters[1].articles[0].number).toBe("2.1")
  })

  it("letters appendix chapters A.. and numbers their articles A.M", () => {
    const plan = buildBookPlan([
      art({ slug: "ch/a", chapterSlug: "ch", chapterTitle: "Ch" }),
      art({
        slug: "appendix/glossary",
        chapterSlug: "appendix",
        chapterTitle: "Appendix",
        title: "Glossary",
        isAppendix: true,
      }),
    ])

    expect(plan.chapters[1].isAppendix).toBe(true)
    expect(plan.chapters[1].number).toBe("A")
    expect(plan.chapters[1].articles[0].number).toBe("A.1")
  })

  it("keeps readme-intro articles in place but unnumbered", () => {
    const plan = buildBookPlan([
      art({
        slug: "ch",
        title: "Ch Overview",
        chapterSlug: "ch",
        chapterTitle: "Ch",
        isReadmeIntro: true,
      }),
      art({ slug: "ch/a", chapterSlug: "ch", chapterTitle: "Ch", title: "A" }),
    ])

    const [intro, first] = plan.chapters[0].articles
    expect(intro.number).toBeNull()
    expect(first.number).toBe("1.1")
  })
})
