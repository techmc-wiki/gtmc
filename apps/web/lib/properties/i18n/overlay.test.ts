import { beforeAll, describe, expect, it } from "vite-plus/test"
import { readFile } from "node:fs/promises"
import { workspacePath } from "@/lib/workspace-paths"
import type { DatasetId, PropertyValue } from "../types"
import zh from "./zh.json"
import {
  EMPTY_OVERLAY,
  normalizeLocale,
  translateText,
  translateValue,
  translatedCategory,
  translatedProperty,
  translatedUnit,
  type PropertyOverlay,
} from "./overlay"

const overlay = zh as PropertyOverlay

const files: Record<DatasetId, string> = {
  blocks: "block_data.json",
  experimental: "block_data_experimental.json",
  legacy: "block_data_1.12.json",
  entities: "entity_data.json",
  items: "item_data.json",
}
interface SourceProperty {
  property_name: string
  property_description?: string
  size_type?: string
  entries: Record<string, PropertyValue>
}
type Structure = (string | { category: string; contents: Structure })[]
interface Source {
  property_structure: Structure
  properties: Record<string, SourceProperty>
}

function strings(value: PropertyValue): string[] {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(strings)
  }
  return []
}
function categories(structure: Structure): string[] {
  return structure.flatMap((item) =>
    typeof item === "string"
      ? []
      : [item.category, ...categories(item.contents)]
  )
}

describe("normalizeLocale", () => {
  it("keeps supported locales and falls back to the default", () => {
    expect(normalizeLocale("zh")).toBe("zh")
    expect(normalizeLocale("en")).toBe("en")
    expect(normalizeLocale("fr")).toBe("zh")
    expect(normalizeLocale("")).toBe("zh")
  })
})

describe("translatedProperty", () => {
  it("falls back to the upstream strings", () => {
    expect(
      translatedProperty(
        EMPTY_OVERLAY,
        "blocks",
        "hardness",
        "Hardness",
        "Determines how fast the block can be mined."
      )
    ).toEqual({
      name: "Hardness",
      description: "Determines how fast the block can be mined.",
    })
  })

  it("prefers the dataset override over the shared translation", () => {
    const testOverlay: PropertyOverlay = {
      properties: { instrument: { name: "乐器" } },
      datasets: {
        legacy: { properties: { instrument: { name: "音符盒乐器" } } },
      },
    }
    expect(
      translatedProperty(testOverlay, "blocks", "instrument", "Instrument", "")
    ).toEqual({ name: "乐器", description: "" })
    expect(
      translatedProperty(
        testOverlay,
        "legacy",
        "instrument",
        "Note Block Instrument",
        ""
      )
    ).toEqual({ name: "音符盒乐器", description: "" })
  })

  it("keeps an empty upstream description empty", () => {
    expect(
      translatedProperty(
        { properties: { hardness: { description: "硬度。" } } },
        "legacy",
        "hardness",
        "Hardness",
        ""
      )
    ).toEqual({ name: "Hardness", description: "" })
  })
})

describe("value and category helpers", () => {
  const testOverlay: PropertyOverlay = {
    categories: { "Block interaction": "方块交互" },
    units: { pixel: "像素" },
    values: { Yes: "是" },
  }

  it("translates values recursively without touching state labels", () => {
    const value: PropertyValue = {
      powered: ["Yes", { nested: "No" }],
      count: 2,
      missing: null,
    }
    expect(translateValue(testOverlay, value)).toEqual({
      powered: ["是", { nested: "No" }],
      count: 2,
      missing: null,
    })
  })

  it("falls back for categories, units, and unknown values", () => {
    expect(translatedCategory(testOverlay, "Tags")).toBe("Tags")
    expect(translatedCategory(testOverlay, "Block interaction")).toBe(
      "方块交互"
    )
    expect(translatedUnit(testOverlay, "block")).toBe("block")
    expect(translatedUnit(testOverlay, undefined)).toBeUndefined()
    expect(translatedUnit(testOverlay, "pixel")).toBe("像素")
    expect(translateText(testOverlay, "No")).toBe("No")
    expect(translateText(testOverlay, "Yes")).toBe("是")
  })
})

describe("zh overlay against the pinned upstream data", () => {
  const sources = new Map<DatasetId, Source>()
  beforeAll(async () => {
    for (const dataset of Object.keys(files) as DatasetId[]) {
      sources.set(
        dataset,
        JSON.parse(
          await readFile(
            workspacePath("content", "properties", "data", files[dataset]),
            "utf8"
          )
        ) as Source
      )
    }
  })

  it("only uses keys that still exist upstream", () => {
    const ids = new Set(
      [...sources.values()].flatMap((source) => Object.keys(source.properties))
    )
    const categoryLabels = new Set(
      [...sources.values()].flatMap((source) =>
        categories(source.property_structure)
      )
    )
    const units = new Set(
      [...sources.values()].flatMap((source) =>
        Object.values(source.properties)
          .map((property) => property.size_type)
          .filter((unit): unit is string => Boolean(unit))
      )
    )
    const values = new Set(
      [...sources.values()].flatMap((source) =>
        Object.values(source.properties).flatMap((property) =>
          Object.values(property.entries).flatMap(strings)
        )
      )
    )

    expect(
      Object.keys(overlay.properties ?? {}).filter((key) => !ids.has(key))
    ).toEqual([])
    expect(
      Object.keys(overlay.categories ?? {}).filter(
        (key) => !categoryLabels.has(key)
      )
    ).toEqual([])
    expect(
      Object.keys(overlay.units ?? {}).filter((key) => !units.has(key))
    ).toEqual([])
    expect(
      Object.keys(overlay.values ?? {}).filter((key) => !values.has(key))
    ).toEqual([])
    for (const [dataset, translations] of Object.entries(
      overlay.datasets ?? {}
    )) {
      const source = sources.get(dataset as DatasetId)
      expect(source).toBeDefined()
      expect(
        Object.keys(translations.properties ?? {}).filter(
          (key) => !(source && key in source.properties)
        )
      ).toEqual([])
    }
  })

  it("translates every property name and non-empty description", () => {
    const untranslatedNames: string[] = []
    const untranslatedDescriptions: string[] = []
    for (const [dataset, source] of sources) {
      for (const [id, property] of Object.entries(source.properties)) {
        const override = overlay.datasets?.[dataset]?.properties?.[id]
        const base = overlay.properties?.[id]
        if (!(override?.name ?? base?.name)) {
          untranslatedNames.push(`${dataset}:${id}`)
        }
        if (
          (property.property_description ?? "").trim() &&
          !(override?.description ?? base?.description)
        ) {
          untranslatedDescriptions.push(`${dataset}:${id}`)
        }
      }
    }
    expect(untranslatedNames).toEqual([])
    expect(untranslatedDescriptions).toEqual([])
  })

  it("translates every category, unit, and listed value", () => {
    const missingCategories = Object.values(sources)
      .flatMap((source) => categories(source.property_structure))
      .filter((category) => !(category in (overlay.categories ?? {})))
    expect(missingCategories).toEqual([])
    const units = new Set(
      [...sources.values()].flatMap((source) =>
        Object.values(source.properties)
          .map((property) => property.size_type)
          .filter((unit): unit is string => Boolean(unit))
      )
    )
    expect(
      [...units].filter((unit) => !(unit in (overlay.units ?? {})))
    ).toEqual([])
  })
})
