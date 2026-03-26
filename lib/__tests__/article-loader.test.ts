import { describe, test, expect } from "vitest"
import {
  isSubmoduleAvailable,
  getArticleContent,
  getArticleTree,
  getArticleBuffer,
} from "../article-loader"

describe("article-loader", () => {
  test("detects submodule availability", () => {
    const result = isSubmoduleAvailable()
    expect(typeof result).toBe("boolean")
  })

  test("reads article from submodule if available", async () => {
    const content = await getArticleContent("README.md")
    expect(content).toBeTruthy()
  })

  test("builds article tree from submodule", async () => {
    const tree = await getArticleTree()
    expect(Array.isArray(tree)).toBe(true)
    expect(tree.length).toBeGreaterThan(0)
  })

  test("reads binary file as buffer", async () => {
    const buffer = await getArticleBuffer("README.md")
    expect(Buffer.isBuffer(buffer)).toBe(true)
  })
})
