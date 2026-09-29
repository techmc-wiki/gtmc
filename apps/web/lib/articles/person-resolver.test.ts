import { describe, expect, it } from "vite-plus/test"
import {
  isArticleAttributionExcluded,
  isMaintainer,
} from "./person-resolver"

describe("maintainer and article attribution policies", () => {
  it("keeps an attributed author eligible for the maintainer role", () => {
    expect(isMaintainer("BFladderbeanawa")).toBe(true)
    expect(isArticleAttributionExcluded("BFladderbeanawa")).toBe(false)
  })

  it("can exclude a maintainer's maintenance commits from article credit", () => {
    expect(isMaintainer("Arcadi4")).toBe(true)
    expect(isArticleAttributionExcluded("Arcadi4")).toBe(true)
  })
})
