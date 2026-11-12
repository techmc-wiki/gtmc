import { beforeAll, describe, expect, it, vi } from "vite-plus/test"

import {
  getPropertyCatalog,
  getPropertyDetails,
  searchProperties,
} from "./data"
import type {
  PropertyCatalog,
  PropertyCondition,
  PropertyResults,
  PropertyValue,
} from "./types"

vi.mock("next/cache", () => ({
  cacheLife: () => {},
  cacheTag: () => {},
}))

const base = {
  query: "",
  columns: [] as string[],
  sort: "",
  descending: false,
  page: 1,
}

function search(
  filters: PropertyCondition[],
  extra: Partial<typeof base> = {}
): Promise<PropertyResults> {
  return searchProperties("blocks", "en", { ...base, filters, ...extra })
}
function names(results: PropertyResults): string[] {
  return results.entries.map((entry) => entry.name)
}
function firstNumber(value: PropertyValue): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const number = firstNumber(item)
      if (number !== null) return number
    }
    return null
  }
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) {
      const number = firstNumber(item)
      if (number !== null) return number
    }
  }
  return null
}

let catalog: PropertyCatalog

beforeAll(async () => {
  catalog = await getPropertyCatalog("blocks", "en")
})

describe("enum multi-select filters", () => {
  it("matches any selected value and leaves old single-value queries unchanged", async () => {
    const [five, twenty, both, singleValue] = await Promise.all([
      search([{ property: "burn_odds", operator: "eq", value: "5" }]),
      search([{ property: "burn_odds", operator: "eq", value: "20" }]),
      search([
        {
          property: "burn_odds",
          operator: "eq",
          value: "",
          values: ["5", "20"],
        },
      ]),
      search([
        {
          property: "burn_odds",
          operator: "eq",
          value: "",
          values: ["5"],
        },
      ]),
    ])
    expect(five.total).toBeGreaterThan(0)
    expect(twenty.total).toBeGreaterThan(0)
    expect(new Set(names(both))).toEqual(
      new Set([...names(five), ...names(twenty)])
    )
    expect(names(both)).toEqual(
      expect.arrayContaining(["Block of Coal", "Bee Nest"])
    )
    expect(names(both)).not.toContain("Dead Bush")
    expect(names(singleValue)).toEqual(names(five))
  })

  it("treats an empty selection as inactive", async () => {
    const [baseline, empty, staleValue] = await Promise.all([
      search([]),
      search([
        { property: "burn_odds", operator: "eq", value: "", values: [] },
      ]),
      search([
        { property: "burn_odds", operator: "eq", value: "5", values: [] },
      ]),
    ])
    expect(empty.total).toBe(baseline.total)
    expect(staleValue.total).toBe(baseline.total)
  })
})

describe("enum option ordering", () => {
  it("sorts numeric-looking values numerically", () => {
    const burnOdds = catalog.properties.find(
      (property) => property.id === "burn_odds"
    )
    expect(burnOdds?.kind).toBe("enum")
    const values = (burnOdds?.options ?? []).map((option) => option.value)
    expect(values).toEqual(expect.arrayContaining(["5", "20", "60", "100"]))
    const numericOrder = values.filter((value) =>
      ["5", "20", "60", "100"].includes(value)
    )
    expect(numericOrder).toEqual(["5", "20", "60", "100"])
  })

  it("prepends each locale's yes/no values as one group", async () => {
    const catalogs = await Promise.all([
      getPropertyCatalog("blocks", "en"),
      getPropertyCatalog("blocks", "zh"),
    ])
    const heads = catalogs.map((testCatalog) =>
      testCatalog.properties
        .find((property) => property.id === "movable")
        ?.options?.slice(0, 2)
        .map((option) => option.label)
    )
    expect(heads).toEqual([
      ["Yes", "No"],
      ["是", "否"],
    ])
  })
})

describe("numeric filters", () => {
  it("accepts exponent notation for ranges", async () => {
    const [plain, exponent] = await Promise.all([
      search([{ property: "blast_resistance", operator: "gte", value: "100" }]),
      search([{ property: "blast_resistance", operator: "gte", value: "1e2" }]),
    ])
    expect(plain.total).toBeGreaterThan(0)
    expect(exponent.total).toBe(plain.total)
    expect(names(exponent)).toEqual(names(plain))
  })

  it("compares equivalent numeric equality spellings", async () => {
    const [stone] = await getPropertyDetails("blocks", "en", ["Stone"])
    const hardness = firstNumber(stone?.values.hardness ?? null)
    expect(hardness).not.toBeNull()
    const value = String(hardness)
    const [plain, exponent] = await Promise.all([
      search([{ property: "hardness", operator: "eq", value }]),
      search([{ property: "hardness", operator: "eq", value: `${value}e0` }]),
    ])
    expect(plain.total).toBeGreaterThan(0)
    expect(exponent.total).toBe(plain.total)
    expect(names(exponent)).toEqual(names(plain))
    expect(names(exponent)).toContain("Stone")
  })
})
