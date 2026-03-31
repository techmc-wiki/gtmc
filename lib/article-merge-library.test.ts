import { describe, it, expect } from "vitest"
import { getMergeLibrary } from "./merge-strategy"

describe("article-merge-library", () => {
  const mergeLib = getMergeLibrary()

  it("should handle clean merge with no conflicts", () => {
    const result = mergeLib.merge({
      baseContent: "line1\nline2\nline3",
      draftContent: "line1\nline2\nline3\nline4",
      latestMainContent: "line1\nline2\nline3",
    })

    expect(result.conflict).toBe(false)
    expect(result.blocks.every((b) => b.type === "ok")).toBe(true)
    expect(result.content).not.toContain("<<<<<<<")
    expect(result.content).toContain("line4")
  })

  it("should detect conflicts", () => {
    const result = mergeLib.merge({
      baseContent: "line1\nline2\nline3",
      draftContent: "line1\ndraft-change\nline3",
      latestMainContent: "line1\nmain-change\nline3",
    })

    expect(result.conflict).toBe(true)
    expect(result.blocks.some((b) => b.type === "conflict")).toBe(true)
    expect(result.content).toContain("<<<<<<<")
    expect(result.content).toContain("=======")
    expect(result.content).toContain(">>>>>>>")
  })

  it("should return structured conflict blocks", () => {
    const result = mergeLib.merge({
      baseContent: "base",
      draftContent: "draft",
      latestMainContent: "main",
    })

    expect(result.conflict).toBe(true)
    const conflictBlock = result.blocks.find((b) => b.type === "conflict")
    expect(conflictBlock).toBeDefined()
    if (conflictBlock && conflictBlock.type === "conflict") {
      expect(conflictBlock.ours).toEqual(["draft"])
      expect(conflictBlock.base).toEqual(["base"])
      expect(conflictBlock.theirs).toEqual(["main"])
    }
  })

  it("should handle identical content", () => {
    const result = mergeLib.merge({
      baseContent: "same",
      draftContent: "same",
      latestMainContent: "same",
    })

    expect(result.conflict).toBe(false)
    expect(result.content).toBe("same")
  })

  it("should use custom labels in conflict markers", () => {
    const result = mergeLib.merge({
      baseContent: "base",
      draftContent: "draft",
      latestMainContent: "main",
      labels: { draft: "OURS", main: "THEIRS" },
    })

    expect(result.content).toContain("<<<<<<< OURS")
    expect(result.content).toContain(">>>>>>> THEIRS")
  })
})
