import { describe, expect, it } from "vite-plus/test"

import { booleanBranches, summarizeEntries, summarizeLabels } from "./summarize"

const cakeLabels = [
  "Cake with Black Candle",
  "Cake with Blue Candle",
  "Cake with Brown Candle",
  "Cake with Candle",
  "Cake with Cyan Candle",
  "Cake with Gray Candle",
  "Cake with Green Candle",
  "Cake with Light Blue Candle",
  "Cake with Light Gray Candle",
  "Cake with Lime Candle",
  "Cake with Magenta Candle",
  "Cake with Orange Candle",
  "Cake with Pink Candle",
  "Cake with Purple Candle",
  "Cake with Red Candle",
  "Cake with White Candle",
  "Cake with Yellow Candle",
]

describe("summarizeEntries", () => {
  it("splits newline-separated labels while keeping the value", () => {
    expect(
      summarizeEntries({
        Cake: 16,
        "Cake with Black Candle\nCake with Blue Candle": [8, 16],
      }),
    ).toEqual([
      { labels: ["Cake"], value: 16 },
      {
        labels: ["Cake with Black Candle", "Cake with Blue Candle"],
        value: [8, 16],
      },
    ])
  })

  it("groups equal scalars in first-seen order", () => {
    expect(summarizeEntries({ Red: 1, Blue: 2, Green: 1, Yellow: 3 })).toEqual([
      { labels: ["Red", "Green"], value: 1 },
      { labels: ["Blue"], value: 2 },
      { labels: ["Yellow"], value: 3 },
    ])
  })

  it("keeps scalar types distinct", () => {
    const groups = summarizeEntries({
      bool: true,
      text: "true",
      number: 1,
      negativeZero: -0,
      zero: 0,
      nothing: null,
      no: false,
      empty: "",
    })
    expect(groups.map((group) => group.labels)).toEqual([
      ["bool"],
      ["text"],
      ["number"],
      ["negativeZero", "zero"],
      ["nothing"],
      ["no"],
      ["empty"],
    ])
  })

  it("compares nested records structurally regardless of key order", () => {
    const first = { faces: [1, 2], states: { lit: true } }
    const groups = summarizeEntries({
      A: first,
      B: { states: { lit: true }, faces: [1, 2] },
      C: { states: { lit: false }, faces: [1, 2] },
    })
    expect(groups).toEqual([
      { labels: ["A", "B"], value: first },
      {
        labels: ["C"],
        value: { states: { lit: false }, faces: [1, 2] },
      },
    ])
    expect(groups[0]?.value).toBe(first)
  })

  it("compares arrays in element order and their contents structurally", () => {
    const groups = summarizeEntries({
      A: [{ x: 1 }, 2],
      B: [{ x: 1 }, 2],
      C: [2, { x: 1 }],
      D: [{ x: 1 }, 3],
    })
    expect(groups.map((group) => group.labels)).toEqual([["A", "B"], ["C"], ["D"]])
  })

  it("never merges unequal conditions that share labels", () => {
    expect(summarizeEntries({ Red: 1, " Red ": 2 })).toEqual([
      { labels: ["Red"], value: 1 },
      { labels: ["Red"], value: 2 },
    ])
  })

  it("preserves duplicate labels from separate keys and repeated lines", () => {
    expect(
      summarizeEntries({
        "Red\nBlue": 1,
        Red: 1,
        "Blue\nBlue": 2,
      }),
    ).toEqual([
      { labels: ["Red", "Blue", "Red"], value: 1 },
      { labels: ["Blue", "Blue"], value: 2 },
    ])
  })

  it("trims labels, drops blank lines, and handles CRLF", () => {
    expect(summarizeEntries({ "\r\n Red \r\n\r\n Blue \r\n": 4 })).toEqual([
      { labels: ["Red", "Blue"], value: 4 },
    ])
  })

  it("keeps an entry whose key has no usable labels", () => {
    expect(summarizeEntries({ "   ": 5 })).toEqual([{ labels: [], value: 5 }])
  })

  it("returns no groups for an empty map", () => {
    expect(summarizeEntries({})).toEqual([])
  })
})

describe("summarizeLabels", () => {
  it("reports the shared frame of four or more distinct labels", () => {
    expect(summarizeLabels(cakeLabels)).toEqual({
      prefix: "Cake with ",
      suffix: " Candle",
      count: cakeLabels.length,
    })
  })

  it("trims, deduplicates, and counts distinct labels", () => {
    expect(
      summarizeLabels([
        " Cake with Red Candle ",
        "Cake with Blue Candle",
        "Cake with Green Candle",
        "Cake with White Candle",
        "Cake with Red Candle",
      ]),
    ).toEqual({ prefix: "Cake with ", suffix: " Candle", count: 4 })
  })

  it("requires at least four distinct labels", () => {
    expect(
      summarizeLabels(["Cake with Red Candle", "Cake with Blue Candle", "Cake with Green Candle"]),
    ).toBeNull()
    expect(summarizeLabels([])).toBeNull()
  })

  it("ignores duplicates when counting distinct labels", () => {
    expect(
      summarizeLabels([
        "Cake with Red Candle",
        "Cake with Blue Candle",
        "Cake with Red Candle",
        "Cake with Blue Candle",
      ]),
    ).toBeNull()
  })

  it("falls back without a shared prefix", () => {
    expect(
      summarizeLabels(["Red Candle", "Blue Candle", "Green Candle", "White Candle"]),
    ).toBeNull()
  })

  it("falls back without a shared suffix", () => {
    expect(summarizeLabels(["Stair Red", "Stair Blue", "Stair Green", "Stair White"])).toBeNull()
  })

  it("rejects a prefix that cuts through a word", () => {
    expect(summarizeLabels(["Black Cake", "Blade Cake", "Blame Cake", "Blast Cake"])).toBeNull()
  })

  it("rejects a suffix that cuts through a word", () => {
    expect(
      summarizeLabels(["Cake Blackened", "Cake Reddened", "Cake Widened", "Cake Saddened"]),
    ).toBeNull()
  })

  it("allows a zero-width middle when the word parts do not overlap", () => {
    expect(
      summarizeLabels(["Cake Candle", "Cake Red Candle", "Cake Blue Candle", "Cake Green Candle"]),
    ).toEqual({ prefix: "Cake ", suffix: " Candle", count: 4 })
  })

  it("rejects prefixes and suffixes whose word parts overlap", () => {
    expect(
      summarizeLabels([
        "Cake Cake",
        "Cake Cake Cake",
        "Cake Cake Cake Cake",
        "Cake Cake Cake Cake Cake",
      ]),
    ).toBeNull()
  })
})

describe("booleanBranches", () => {
  it("reads true/false branches and preserves their values", () => {
    expect(
      booleanBranches({
        "waterlogged: false": 0.7,
        "waterlogged: true": 100,
      }),
    ).toEqual({ name: "waterlogged", yes: 100, no: 0.7 })
  })

  it("accepts case-insensitive literals and spaces around the colon", () => {
    expect(
      booleanBranches({
        " Lit : FALSE ": false,
        " Lit : TRUE ": 12,
      }),
    ).toEqual({ name: "Lit", yes: 12, no: false })
  })

  it("does not require the branches in true-then-false order", () => {
    expect(
      booleanBranches({
        "open: false": [1, 2],
        "open: true": { reason: null },
      }),
    ).toEqual({ name: "open", yes: { reason: null }, no: [1, 2] })
  })

  it("preserves falsey branch values untouched", () => {
    const yesValue = null
    const noValue = ""
    const branches = booleanBranches({
      "active: true": yesValue,
      "active: false": noValue,
    })
    expect(branches).toEqual({ name: "active", yes: yesValue, no: noValue })
    expect(branches?.yes).toBeNull()
    expect(branches?.no).toBe("")
  })

  it("requires exactly two keys", () => {
    expect(booleanBranches({ "open: true": 1 })).toBeNull()
    expect(booleanBranches({ "open: true": 1, "open: false": 0, extra: 3 })).toBeNull()
  })

  it("requires both keys to name the same state", () => {
    expect(booleanBranches({ "waterlogged: true": 1, "open: false": 0 })).toBeNull()
  })

  it("rejects non-boolean literals", () => {
    expect(booleanBranches({ "open: yes": 1, "open: no": 0 })).toBeNull()
    expect(booleanBranches({ "open: true": 1, " open : true ": 0 })).toBeNull()
  })

  it("rejects multiline keys", () => {
    expect(booleanBranches({ "open\n: true": 1, "open\n: false": 0 })).toBeNull()
  })

  it("rejects multi-colon state names and empty names", () => {
    expect(booleanBranches({ "foo: bar: true": 1, "foo: bar: false": 0 })).toBeNull()
    expect(booleanBranches({ ": true": 1, ": false": 0 })).toBeNull()
  })
})
