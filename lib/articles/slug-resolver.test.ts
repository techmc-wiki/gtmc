import { describe, expect, test } from "vite-plus/test"

import {
  encodeSlug,
  decodeSlugPath,
  getSlugTail,
  validateSlug,
} from "./slug-resolver"

describe("encodeSlug", () => {
  test("encodes each segment with URI encoding and preserves separator", () => {
    expect(encodeSlug("Chapter 1/Section 2")).toBe("Chapter%201/Section%202")
  })

  test("encodes special characters in each segment", () => {
    expect(encodeSlug("a?b/c d")).toBe("a%3Fb/c%20d")
  })

  test("returns empty string for empty input", () => {
    expect(encodeSlug("")).toBe("")
  })

  test("handles single segment without a slash", () => {
    expect(encodeSlug("article")).toBe("article")
  })
})

describe("decodeSlugPath", () => {
  test("decodes and joins encoded segments", () => {
    expect(decodeSlugPath(["Chapter%201", "Section%202"])).toBe(
      "Chapter 1/Section 2"
    )
  })

  test("returns empty string for empty segments array", () => {
    expect(decodeSlugPath([])).toBe("")
  })

  test("handles single segment", () => {
    expect(decodeSlugPath(["article"])).toBe("article")
  })

  test("decodes multiple special character encodings", () => {
    expect(decodeSlugPath(["a%2B%2Fb", "c%3Fd"])).toBe("a+/b/c?d")
  })
})

describe("getSlugTail", () => {
  test("returns last segment from multi-part slug", () => {
    expect(getSlugTail("chapter/section/article")).toBe("article")
  })

  test("returns the slug itself when it has no slashes", () => {
    expect(getSlugTail("article")).toBe("article")
  })

  test("returns trailing empty segment when slug ends with slash", () => {
    expect(getSlugTail("a/b/")).toBe("")
  })

  test("returns empty string for empty input", () => {
    expect(getSlugTail("")).toBe("")
  })
})

describe("validateSlug", () => {
  test("accepts simple lowercase word", () => {
    expect(validateSlug("tree-farm")).toBe(true)
  })

  test("accepts numeric prefix", () => {
    expect(validateSlug("01-introduction")).toBe(true)
  })

  test("accepts single character", () => {
    expect(validateSlug("a")).toBe(true)
  })

  test("accepts single number", () => {
    expect(validateSlug("1")).toBe(true)
  })

  test("rejects uppercase characters", () => {
    expect(validateSlug("TreeFarm")).toBe(false)
  })

  test("rejects underscores", () => {
    expect(validateSlug("tree_farm")).toBe(false)
  })

  test("rejects leading hyphen", () => {
    expect(validateSlug("-tree-farm")).toBe(false)
  })

  test("rejects trailing hyphen", () => {
    expect(validateSlug("tree-farm-")).toBe(false)
  })

  test("rejects spaces", () => {
    expect(validateSlug("tree farm")).toBe(false)
  })

  test("rejects empty string", () => {
    expect(validateSlug("")).toBe(false)
  })
})
