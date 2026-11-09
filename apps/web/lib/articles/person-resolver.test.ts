import type * as NodeFs from "node:fs"

import type { ArticleEntry } from "@gtmc/ssg/articles/types"
import { describe, expect, it, vi } from "vite-plus/test"

import type * as ArticlesManifest from "@/lib/articles/manifest"

import {
  getArticlesByAuthor,
  getAuthorProfileHandle,
  getMaintainerHandles,
  getProfileHandles,
  getUniqueAuthors,
  isArticleAttributionExcluded,
  isMaintainer,
  isSameAuthor,
  resolveAuthorPerson,
  resolveProfileHandle,
} from "./person-resolver"

/**
 * Deterministic identities. None of these handles appear in the checked-in
 * roster, so the positive expectations below can only pass when the resolver
 * reads these fixtures instead of the repository configuration.
 *
 * Fixture builders are function declarations at module scope: declarations are
 * initialized before any statement runs, so the hoisted manifest mock can
 * reference them without a temporal dead zone. Only the raw file-contents
 * table sits inside `vi.hoisted`, because the fs mock reads it while the
 * resolver module is still being imported.
 */
function article(
  slug: string,
  overrides: Partial<ArticleEntry> = {}
): ArticleEntry {
  return {
    filePath: `articles/${slug}.mdx`,
    slug,
    titleByLocale: {},
    availableLocales: ["en", "zh"],
    localizedFilePaths: {},
    chapterTitleByLocale: {},
    introTitleByLocale: {},
    descriptionByLocale: {},
    hasIntro: false,
    index: 0,
    isFolder: false,
    isAppendix: false,
    isPreface: false,
    lastmodByLocale: {},
    translatedFromRevisionByLocale: {},
    translationFreshnessByLocale: {},
    ...overrides,
  }
}

function buildFixtureManifest(): Record<string, ArticleEntry> {
  return {
    folder: article("folder", {
      author: "Ghost",
      index: 0,
      isFolder: true,
    }),
    second: article("second", { coAuthors: ["Wren"], index: 1 }),
    "excluded-author": article("excluded-author", {
      author: "Aurelio",
      availableLocales: ["en"],
      index: 2,
    }),
    intro: article("intro", {
      author: "wren",
      descriptionByLocale: { en: " intro description " },
      index: 3,
      isPreface: true,
      titleByLocale: { en: "  Intro  ", zh: "序" },
    }),
    "override-alias": article("override-alias", {
      author: "Ember",
      availableLocales: ["en"],
      index: 4,
    }),
    "sable-article": article("sable-article", {
      author: "Sablewood",
      availableLocales: ["en"],
      index: 5,
    }),
    "zh-only": article("zh-only", {
      author: "sable",
      availableLocales: ["zh"],
      index: 6,
      titleByLocale: { zh: " 仅中文 " },
    }),
  }
}

const fixtures = vi.hoisted(() => {
  const configFiles: Record<string, string> = {
    "people.yml": `Fjord:
  name: Fjord
Mire:
  name: Mire
Quillon:
  name: Quillon
  description: Test pilot
  profile: /avatars/quillon.png
Sable:
  name: Sable
Nyx:
  name: Nyx
`,
    "authors-alias.yml": `Quillon:
  - Wren
Sable:
  - Ember
  - Sablewood
gtmc-bot:
  - GTMC Bot
`,
    "author-alias-overrides.yml": `Aurelio:
  - Ember
`,
    "maintainers.yml": `# Fixture roles: no entry appears in the live roster.
- Wren
- fjord
- MIRE
- Ghost
- GTMC Bot
`,
    "article-edit-exclusions.yml": `# Fixture exclusions are independent of maintainer status.
# Wren resolves to the maintenance-excluded canonical handle Quillon.
- Wren
- Aurelio
- GTMC Bot
`,
  }

  return { configFiles }
})

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFs>()

  function readFileSync(
    path: string | Buffer | URL,
    options?: BufferEncoding
  ): string | Buffer {
    const fileName = String(path).split(/[/\\]/u).pop() ?? ""
    const fixture = fixtures.configFiles[fileName]
    if (fixture !== undefined) return fixture
    return options === undefined
      ? actual.readFileSync(path)
      : actual.readFileSync(path, options)
  }

  return { ...actual, readFileSync }
})

vi.mock("@/lib/articles/manifest", async (importOriginal) => {
  const actual = await importOriginal<typeof ArticlesManifest>()
  return { ...actual, loadArticleManifest: () => buildFixtureManifest() }
})

const fixtureManifest = buildFixtureManifest()

const explicitManifest: Record<string, ArticleEntry> = {
  atlas: {
    ...fixtureManifest["sable-article"],
    filePath: "articles/atlas.mdx",
    slug: "atlas",
    author: "Nyx",
  },
}

describe("maintainer policy", () => {
  it("resolves a maintainer listed by alias, case-insensitively", () => {
    expect(isMaintainer("Wren")).toBe(true)
    expect(isMaintainer("wREn")).toBe(true)
    expect(isMaintainer("QUILLON")).toBe(true)
  })

  it("resolves maintainers listed under their canonical handle", () => {
    expect(isMaintainer("fjord")).toBe(true)
    expect(isMaintainer("FJORD")).toBe(true)
    expect(isMaintainer("MIRE")).toBe(true)
  })

  it("accepts a maintainer without a people profile", () => {
    expect(isMaintainer("Ghost")).toBe(true)
  })

  it("rejects service accounts and unknown handles", () => {
    expect(isMaintainer("GTMC Bot")).toBe(false)
    expect(isMaintainer("gtmc-bot")).toBe(false)
    expect(isMaintainer("Aurelio")).toBe(false)
    expect(isMaintainer("Nox")).toBe(false)
  })

  it("lists only public maintainer handles, sorted", () => {
    expect(getMaintainerHandles()).toEqual(["Fjord", "Mire", "Quillon"])
  })
})

describe("article attribution exclusion policy", () => {
  it("excludes identities configured directly or by alias", () => {
    expect(isArticleAttributionExcluded("Aurelio")).toBe(true)
    expect(isArticleAttributionExcluded("aurelio")).toBe(true)
    expect(isArticleAttributionExcluded("Wren")).toBe(true)
    expect(isArticleAttributionExcluded("quillon")).toBe(true)
    expect(isArticleAttributionExcluded("GTMC Bot")).toBe(true)
    expect(isArticleAttributionExcluded("gtmc-bot")).toBe(true)
  })

  it("keeps unlisted identities attributable", () => {
    expect(isArticleAttributionExcluded("Fjord")).toBe(false)
    expect(isArticleAttributionExcluded("Mire")).toBe(false)
    expect(isArticleAttributionExcluded("Sable")).toBe(false)
    expect(isArticleAttributionExcluded("Nox")).toBe(false)
  })

  it("keeps maintainer and attribution policies independent", () => {
    const cases = [
      { excluded: true, handle: "Quillon", maintainer: true },
      { excluded: false, handle: "Fjord", maintainer: true },
      { excluded: true, handle: "Aurelio", maintainer: false },
      { excluded: false, handle: "Sable", maintainer: false },
    ]

    for (const { excluded, handle, maintainer } of cases) {
      expect(isMaintainer(handle)).toBe(maintainer)
      expect(isArticleAttributionExcluded(handle)).toBe(excluded)
    }
  })
})

describe("alias resolution", () => {
  it("maps aliases case-insensitively to their canonical handle", () => {
    expect(isSameAuthor("Wren", "QUILLON")).toBe(true)
    expect(isSameAuthor("Mire", "mire")).toBe(true)
  })

  it("prefers manual overrides over generated aliases", () => {
    expect(isSameAuthor("Ember", "Aurelio")).toBe(true)
    expect(isSameAuthor("Ember", "Sable")).toBe(false)
  })

  it("compares unknown handles case-insensitively", () => {
    expect(isSameAuthor("Nox", "nOx")).toBe(true)
  })

  it("resolves a person profile through an alias", () => {
    expect(resolveAuthorPerson("Wren")).toMatchObject({
      key: "Quillon",
      name: "Quillon",
      description: "Test pilot",
      profile: "/avatars/quillon.png",
      isFallback: false,
    })
  })

  it("falls back to the requested handle for unknown identities", () => {
    expect(resolveAuthorPerson("Nox")).toMatchObject({
      key: "Nox",
      name: "Nox",
      profile: null,
      isFallback: true,
    })
  })
})

describe("article attribution", () => {
  it("canonicalizes aliases, drops exclusions, skips folders", () => {
    // Quillon (a maintainer) and Aurelio are attribution-excluded, and the
    // folder entry is skipped. Sable survives through an alias and a casing
    // variant, which collapse to one canonical handle.
    expect(getUniqueAuthors()).toEqual(["Sable"])
  })

  it("uses an explicitly provided manifest instead of the loaded one", () => {
    expect(getUniqueAuthors(explicitManifest)).toEqual(["Nyx"])
  })

  it("unions authors with maintainers without merging the policies", () => {
    // Quillon is attribution-excluded yet still a public maintainer, so it
    // returns through the maintainer role rather than through attribution.
    expect(getProfileHandles()).toEqual([
      "Fjord",
      "Mire",
      "Quillon",
      "Sable",
    ])
    expect(getProfileHandles(explicitManifest)).toEqual([
      "Fjord",
      "Mire",
      "Nyx",
      "Quillon",
    ])
  })
})

describe("profile handle resolution", () => {
  it("resolves known aliases and handles in any casing", () => {
    expect(resolveProfileHandle("WrEn")).toBe("Quillon")
    expect(resolveProfileHandle("fjord")).toBe("Fjord")
    expect(resolveProfileHandle("Mire")).toBe("Mire")
    expect(resolveProfileHandle("Sable")).toBe("Sable")
  })

  it("rejects excluded, alias-to-excluded, and unknown handles", () => {
    expect(resolveProfileHandle("Aurelio")).toBeNull()
    expect(resolveProfileHandle("Ember")).toBeNull()
    expect(resolveProfileHandle("Nox")).toBeNull()
  })

  it("rejects a maintainer without a people profile", () => {
    expect(resolveProfileHandle("Ghost")).toBeNull()
  })

  it("resolves a people key only with a public profile route", () => {
    expect(getAuthorProfileHandle("Quillon")).toBe("Quillon")
    expect(getAuthorProfileHandle("Sable")).toBe("Sable")
    expect(getAuthorProfileHandle("Mire")).toBe("Mire")
    expect(getAuthorProfileHandle("Nyx")).toBeNull()
  })
})

describe("articles by author", () => {
  it("matches primary and co-authors through aliases", () => {
    const results = getArticlesByAuthor("QUILLON", "en")

    expect(results.map((result) => result.slug)).toEqual(["second", "intro"])
    expect(results[0].author).toBeUndefined()
    expect(results[0].coAuthors).toEqual(["Wren"])
    expect(results[0].title).toBe("second")
    expect(results[0].description).toBe("")
    expect(results[1]).toMatchObject({
      author: "wren",
      description: "intro description",
      index: 3,
      isPreface: true,
      title: "Intro",
    })
  })

  it("filters by available locale and localizes titles", () => {
    const sableEn = getArticlesByAuthor("Sablewood", "en")
    expect(sableEn.map((result) => result.slug)).toEqual(["sable-article"])

    const sableZh = getArticlesByAuthor("sable", "zh")
    expect(sableZh.map((result) => result.slug)).toEqual(["zh-only"])
    expect(sableZh[0].title).toBe("仅中文")

    expect(getArticlesByAuthor("quillon", "zh")[1].title).toBe("序")
  })

  it("skips folders and unknown authors", () => {
    expect(getArticlesByAuthor("Ghost", "en")).toEqual([])
    expect(getArticlesByAuthor("Nox", "en")).toEqual([])
  })
})
