import { describe, expect, test } from "vitest"

import { encodeSlug, decodeSlugPath, getSlugTail } from "./slug-utils"

describe("slug-utils", () => {
  test("encodeSlug encodes each segment and preserves separators", () => {
    expect(encodeSlug("Chapter 1/Section 2")).toBe("Chapter%201/Section%202")
  })

  test("decodeSlugPath decodes segments and joins with slash", () => {
    expect(decodeSlugPath(["Chapter%201", "Section%202"])).toBe(
      "Chapter 1/Section 2"
    )
  })

  test("getSlugTail returns last segment of slug path", () => {
    expect(getSlugTail("chapter/section/article")).toBe("article")
  })
})
