import MiniSearch from "minisearch"
import { CJK_TOKENIZER } from "@/lib/cjk-tokenizer"
import type { GlossaryEntry, GlossarySummaryEntry } from "./manifest"
import summaryData from "@/data/glossary-summary.json" with { type: "json" }

const glossarySummary = summaryData as GlossarySummaryEntry[]

type IndexedGlossaryEntry = GlossarySummaryEntry & { id: string }

export function createGlossarySearch(): MiniSearch<IndexedGlossaryEntry> {
  const miniSearch = new MiniSearch<IndexedGlossaryEntry>({
    fields: ["fullFormEn", "shortForm", "category"],
    storeFields: ["slug", "fullFormEn", "shortForm", "category"],
    tokenize: CJK_TOKENIZER,
    searchOptions: {
      boost: { fullFormEn: 2 },
      fuzzy: 0.2,
      prefix: true,
      tokenize: CJK_TOKENIZER,
    },
  })

  const documents: IndexedGlossaryEntry[] = glossarySummary.map((entry) => {
    const doc: IndexedGlossaryEntry = Object.assign({}, entry, {
      id: entry.slug,
    })
    return doc
  })

  miniSearch.addAll(documents)
  return miniSearch
}

// Singleton instance — built once per module load (server-side only)
let glossaryIndex: MiniSearch<IndexedGlossaryEntry> | null = null

function getGlossaryIndex(): MiniSearch<IndexedGlossaryEntry> {
  if (!glossaryIndex) {
    glossaryIndex = createGlossarySearch()
  }
  return glossaryIndex
}

export function searchGlossary(query: string): GlossarySummaryEntry[] {
  if (!query.trim()) return []
  const index = getGlossaryIndex()
  const results = index.search(query)
  return results.map((r) => ({
    slug: r.slug as string,
    fullFormEn: r.fullFormEn as string,
    shortForm: r.shortForm as string,
    category: r.category as string,
  }))
}

type IndexedFullEntry = { id: string } & Record<string, string>

export function buildGlossarySearchIndex(
  entries: GlossaryEntry[],
  scope: "active" | "all",
  activeLocale: "en" | "zh"
): MiniSearch<IndexedFullEntry> {
  let fields: string[]

  if (scope === "all") {
    fields = [
      "fullFormEn",
      "shortForm",
      "trans_ar",
      "trans_zh",
      "trans_fr",
      "trans_de",
      "trans_it",
      "trans_ja",
      "trans_ko",
      "trans_pt",
      "trans_ru",
      "trans_es",
    ]
  } else if (activeLocale === "en") {
    fields = ["fullFormEn", "shortForm"]
  } else {
    fields = ["fullFormEn", `trans_${activeLocale}`]
  }

  const miniSearch = new MiniSearch<IndexedFullEntry>({
    fields,
    storeFields: ["slug", "fullFormEn", "shortForm"],
    tokenize: CJK_TOKENIZER,
    searchOptions: {
      boost: { fullFormEn: 2 },
      fuzzy: 0.2,
      prefix: true,
      tokenize: CJK_TOKENIZER,
    },
  })

  const documents: IndexedFullEntry[] = entries.map((entry) => {
    const doc: IndexedFullEntry = {
      id: entry.slug,
      slug: entry.slug,
      fullFormEn: entry.fullFormEn,
      shortForm: entry.shortForm,
    }
    for (const [locale, translation] of Object.entries(entry.translations)) {
      if (translation) {
        doc[`trans_${locale}`] = translation.value
      }
    }
    return doc
  })

  miniSearch.addAll(documents)
  return miniSearch
}
