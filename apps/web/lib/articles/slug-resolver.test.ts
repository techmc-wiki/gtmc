import { describe, expect, test } from "vite-plus/test";

import { encodeSlug, decodeSlugPath } from "./slug-resolver";

describe("encodeSlug", () => {
  test("encodes each segment with URI encoding and preserves separator", () => {
    expect(encodeSlug("Chapter 1/Section 2")).toBe("Chapter%201/Section%202");
  });

  test("encodes special characters in each segment", () => {
    expect(encodeSlug("a?b/c d")).toBe("a%3Fb/c%20d");
  });

  test("returns empty string for empty input", () => {
    expect(encodeSlug("")).toBe("");
  });

  test("handles single segment without a slash", () => {
    expect(encodeSlug("article")).toBe("article");
  });
});

describe("decodeSlugPath", () => {
  test("decodes and joins encoded segments", () => {
    expect(decodeSlugPath(["Chapter%201", "Section%202"])).toBe("Chapter 1/Section 2");
  });

  test("returns empty string for empty segments array", () => {
    expect(decodeSlugPath([])).toBe("");
  });

  test("handles single segment", () => {
    expect(decodeSlugPath(["article"])).toBe("article");
  });

  test("decodes multiple special character encodings", () => {
    expect(decodeSlugPath(["a%2B%2Fb", "c%3Fd"])).toBe("a+/b/c?d");
  });
});
