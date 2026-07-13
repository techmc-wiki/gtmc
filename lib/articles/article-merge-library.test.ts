import { describe, it, expect } from "vite-plus/test"
import { getMergeLibrary } from "@/lib/review/merge-strategy"

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

  it("should normalize CRLF line endings to LF", () => {
    const result = mergeLib.merge({
      baseContent: "a\r\nb\r\nc",
      draftContent: "a\r\ndraft-change\r\nc",
      latestMainContent: "a\r\nb\r\nc",
    })

    expect(result.conflict).toBe(false)
    expect(result.content).not.toContain("\r\n")
    expect(result.content).not.toContain("\r")
    expect(result.content).toContain("draft-change")
  })

  it("should exclude false conflict when both branches make identical change", () => {
    const result = mergeLib.merge({
      baseContent: "a\nb\nc",
      draftContent: "a\nmodified-b\nc",
      latestMainContent: "a\nmodified-b\nc",
    })

    expect(result.conflict).toBe(false)
    expect(result.blocks.every((b) => b.type === "ok")).toBe(true)
    expect(result.content).toContain("modified-b")
  })

  it("should handle empty base with identical additions", () => {
    const result = mergeLib.merge({
      baseContent: "",
      draftContent: "alpha\nbeta",
      latestMainContent: "alpha\nbeta",
    })

    expect(result.conflict).toBe(false)
    expect(result.content).toBe("alpha\nbeta")
  })

  it("should produce two independent conflict blocks with interspersed ok region", () => {
    const result = mergeLib.merge({
      baseContent: "line-a\nshared\nline-c",
      draftContent: "draft-a\nshared\ndraft-c",
      latestMainContent: "main-a\nshared\nmain-c",
    })

    expect(result.conflict).toBe(true)
    const conflictBlocks = result.blocks.filter((b) => b.type === "conflict")
    expect(conflictBlocks.length).toBe(2)
    const okBlocks = result.blocks.filter((b) => b.type === "ok")
    expect(okBlocks.length).toBe(1)
    expect(okBlocks[0].lines).toEqual(["shared"])

    const okLines = okBlocks[0].lines.join("\n")
    expect(okLines).toBe("shared")
  })

  it("should cleanly merge non-overlapping changes on different lines", () => {
    const result = mergeLib.merge({
      baseContent: "a\nb\nc\nd\ne",
      draftContent: "draft-a\nb\nc\nd\ne",
      latestMainContent: "a\nb\nc\nmain-d\ne",
    })

    expect(result.conflict).toBe(false)
    const lines = result.content.split("\n")
    expect(lines[0]).toBe("draft-a")
    expect(lines[3]).toBe("main-d")
    expect(lines[4]).toBe("e")
  })

  it("should preserve trailing newline when all inputs end with newline", () => {
    const result = mergeLib.merge({
      baseContent: "line1\n",
      draftContent: "line1\nline2\n",
      latestMainContent: "line1\n",
    })

    expect(result.conflict).toBe(false)
    expect(result.content.endsWith("\n")).toBe(true)
    expect(result.content).toBe("line1\nline2\n")
  })

  it("should detect conflict on single-character change to same line", () => {
    const result = mergeLib.merge({
      baseContent: "x",
      draftContent: "a",
      latestMainContent: "b",
    })

    expect(result.conflict).toBe(true)
    const block = result.blocks.find((b) => b.type === "conflict")
    expect(block).toBeDefined()
    if (block?.type === "conflict") {
      expect(block.ours).toEqual(["a"])
      expect(block.base).toEqual(["x"])
      expect(block.theirs).toEqual(["b"])
    }
  })

  it("should report conflict when draft deletes and main modifies the same region", () => {
    const result = mergeLib.merge({
      baseContent: "keep\nremove-or-change\nkeep2",
      draftContent: "keep\nkeep2",
      latestMainContent: "keep\nmodified\nkeep2",
    })

    expect(result.conflict).toBe(true)
    const block = result.blocks.find((b) => b.type === "conflict")
    expect(block).toBeDefined()
  })

  it("should merge draft-only change against unchanged main cleanly", () => {
    const result = mergeLib.merge({
      baseContent: "a\nb\nc",
      draftContent: "a\nb\nmodified-c",
      latestMainContent: "a\nb\nc",
    })

    expect(result.conflict).toBe(false)
    expect(result.content).toContain("modified-c")
    expect(result.blocks.every((b) => b.type === "ok")).toBe(true)
  })

  it("should handle complex interleaving of additions and deletions across multiple hunks", () => {
    const result = mergeLib.merge({
      baseContent: "line-a\nremove-b\nline-c\nremove-d\nline-e",
      draftContent: "line-a\ndraft-added\nline-c\nremove-d\nline-e",
      latestMainContent: "line-a\nremove-b\nline-c\nmain-added\nline-e",
    })

    expect(result.conflict).toBe(false)
    expect(result.content).not.toContain("remove-b")
    expect(result.content).not.toContain("remove-d")
    expect(result.content).toContain("draft-added")
    expect(result.content).toContain("main-added")
  })
})
