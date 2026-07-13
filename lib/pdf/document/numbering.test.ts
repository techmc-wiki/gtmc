import { describe, expect, it } from "vite-plus/test"

import type { LinearizedArticle } from "@/lib/articles/linearize"
import { linearizeArticles } from "@/lib/articles/linearize"
import type { ChapterNavNode } from "@/lib/articles/chapter-nav-types"
import { preparePublicChapterNav } from "@/lib/articles/public-tree"
import type { ArticleTreeNode } from "@/lib/github/sync"

import { buildBookPlan } from "./numbering"
import { chapterArticles } from "./types"

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
    expect(chapterArticles(plan.chapters[0]).map((a) => a.number)).toEqual([
      "1.1",
      "1.2",
    ])
    expect(chapterArticles(plan.chapters[1])[0].number).toBe("2.1")
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
    expect(chapterArticles(plan.chapters[1])[0].number).toBe("A.1")
  })

  it("places ordinary chapters before appendices while preserving group order", () => {
    const plan = buildBookPlan([
      art({
        slug: "appendix/first",
        chapterSlug: "appendix/first",
        chapterTitle: "First appendix",
        isAppendix: true,
      }),
      art({
        slug: "alpha/a",
        chapterSlug: "alpha",
        chapterTitle: "Alpha",
      }),
      art({
        slug: "appendix/second",
        chapterSlug: "appendix/second",
        chapterTitle: "Second appendix",
        isAppendix: true,
      }),
      art({
        slug: "beta/b",
        chapterSlug: "beta",
        chapterTitle: "Beta",
      }),
    ])

    expect(plan.chapters.map((chapter) => chapter.slug)).toEqual([
      "alpha",
      "beta",
      "appendix/first",
      "appendix/second",
    ])
    expect(plan.chapters.map((chapter) => chapter.number)).toEqual([
      "1",
      "2",
      "A",
      "B",
    ])
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

    const [intro, first] = chapterArticles(plan.chapters[0])
    expect(intro.number).toBeNull()
    expect(first.number).toBe("1.1")
  })

  it("builds recursive folders while keeping article numbers flat", () => {
    const plan = buildBookPlan([
      art({
        slug: "ch/mechanics",
        title: "Mechanics intro",
        folders: [{ slug: "ch/mechanics", title: "Mechanics &amp; Timing" }],
        isReadmeIntro: true,
      }),
      art({
        slug: "ch/mechanics/signals/a",
        title: "Signals A",
        folders: [
          { slug: "ch/mechanics", title: "Mechanics &amp; Timing" },
          { slug: "ch/mechanics/signals", title: "Signals" },
        ],
      }),
      art({
        slug: "ch/direct",
        title: "Direct",
      }),
      art({
        slug: "ch/mechanics/signals/b",
        title: "Signals B",
        folders: [
          { slug: "ch/mechanics", title: "Mechanics &amp; Timing" },
          { slug: "ch/mechanics/signals", title: "Signals" },
        ],
      }),
    ])

    const chapter = plan.chapters[0]
    expect(chapterArticles(chapter).map((entry) => entry.number)).toEqual([
      null,
      "1.1",
      "1.2",
      "1.3",
    ])
    expect(chapter.content).toMatchObject([
      {
        kind: "folder",
        slug: "ch/mechanics",
        title: "Mechanics & Timing",
        content: [
          { kind: "article" },
          {
            kind: "folder",
            slug: "ch/mechanics/signals",
            content: [{ kind: "article" }, { kind: "article" }],
          },
        ],
      },
      { kind: "article" },
    ])
  })
})

function node(
  overrides: Partial<ArticleTreeNode & ChapterNavNode> & { slug: string }
): ArticleTreeNode & Partial<ChapterNavNode> {
  return {
    id: overrides.slug,
    title: overrides.slug,
    isFolder: false,
    parentId: null,
    children: [],
    ...overrides,
  }
}

describe("preparePublicChapterNav", () => {
  it("clones, injects nested intros, and sorts folder/article siblings by index", () => {
    const source = [
      node({ slug: "unindexed", title: "Unindexed", index: -1 }),
      node({
        slug: "folder",
        title: "Folder",
        isFolder: true,
        index: 2,
        introTitle: "Folder intro",
        children: [
          node({
            slug: "folder/nested",
            title: "Nested",
            isFolder: true,
            parentId: "folder",
            introTitle: "Nested intro",
            children: [
              node({
                slug: "folder/nested/article",
                title: "Nested article",
                parentId: "folder/nested",
                index: 1,
              }),
            ],
          }),
        ],
      }),
      node({ slug: "article", title: "Article", index: 1 }),
    ]

    const prepared = preparePublicChapterNav(source)

    expect(prepared.map((item) => item.slug)).toEqual([
      "article",
      "folder",
      "unindexed",
    ])
    expect(prepared[1].children[0]).toMatchObject({
      slug: "folder",
      title: "Folder intro",
      isReadmeIntro: true,
    })
    expect(prepared[1].children[1].children[0]).toMatchObject({
      slug: "folder/nested",
      title: "Nested intro",
      isReadmeIntro: true,
    })
    expect(source[1].children).toHaveLength(1)
    expect(source[1].children[0].children).toHaveLength(1)
  })

  it("preserves appendix ownership for promoted articles and folder intros", async () => {
    const source = [
      node({
        slug: "appendix",
        title: "Appendix",
        isFolder: true,
        isAppendix: true,
        children: [
          node({
            slug: "appendix/stack",
            title: "Stacks",
            parentId: "appendix",
            index: 1,
            isAppendix: true,
          }),
          node({
            slug: "appendix/glossary",
            title: "Glossary",
            parentId: "appendix",
            isFolder: true,
            index: 2,
            introTitle: "Glossary intro",
            isAppendix: true,
            children: [
              node({
                slug: "appendix/glossary/terms",
                title: "Terms",
                parentId: "appendix/glossary",
                isAppendix: true,
              }),
            ],
          }),
        ],
      }),
    ]

    const prepared = preparePublicChapterNav(source)
    const linearized = await linearizeArticles(prepared)

    expect(prepared.map((item) => item.slug)).toEqual([
      "appendix/stack",
      "appendix/glossary",
    ])
    expect(prepared[0]).toMatchObject({
      isAppendix: true,
      appendixOwner: { slug: "appendix", title: "Appendix" },
    })
    expect(prepared[1].children[0]).toMatchObject({
      slug: "appendix/glossary",
      isReadmeIntro: true,
      isAppendix: true,
      appendixOwner: { slug: "appendix", title: "Appendix" },
    })
    expect(linearized).toMatchObject([
      {
        slug: "appendix/stack",
        chapterSlug: "appendix",
        chapterTitle: "Appendix",
        isAppendix: true,
      },
      {
        slug: "appendix/glossary",
        chapterSlug: "appendix",
        chapterTitle: "Appendix",
        folders: [{ slug: "appendix/glossary", title: "Glossary" }],
        isAppendix: true,
        isReadmeIntro: true,
      },
      {
        slug: "appendix/glossary/terms",
        chapterSlug: "appendix",
        chapterTitle: "Appendix",
        folders: [{ slug: "appendix/glossary", title: "Glossary" }],
        isAppendix: true,
      },
    ])
  })

  it("keeps nested appendix leaves inside their ordinary top-level chapter", async () => {
    const prepared = preparePublicChapterNav([
      node({
        slug: "ordinary",
        title: "Ordinary",
        isFolder: true,
        children: [
          node({
            slug: "ordinary/appendix",
            title: "Appendix",
            isFolder: true,
            parentId: "ordinary",
            isAppendix: true,
            children: [
              node({
                slug: "ordinary/appendix/note",
                title: "Note",
                parentId: "ordinary/appendix",
                isAppendix: true,
              }),
            ],
          }),
        ],
      }),
    ])

    const [article] = await linearizeArticles(prepared)

    expect(article).toMatchObject({
      slug: "ordinary/appendix/note",
      chapterSlug: "ordinary",
      chapterTitle: "Ordinary",
      isAppendix: false,
    })
  })
})
