import MiniSearch from "minisearch"
import { CJK_TOKENIZER } from "@/lib/search/cjk-tokenizer"
import type { GlossaryEntryBase, GlossarySummaryEntry } from "./manifest"
import summaryData from "@/data/glossary-summary.json" with { type: "json" }

const glossarySummary = summaryData as GlossarySummaryEntry[]

type IndexedGlossaryEntry = GlossarySummaryEntry & { id: string }

export function createGlossarySearch(): MiniSearch<IndexedGlossaryEntry> {
  const miniSearch = new MiniSearch<IndexedGlossaryEntry>({
    fields: ["fullFormEn", "shortForm", "category"],
    storeFields: ["slug", "fullFormEn", "shortForm", "categories"],
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
      // MiniSearch indexes strings only; categories remain structured in the stored document.
      category: entry.categories.join("; "),
    })
    return doc
  })

  miniSearch.addAll(documents)
  return miniSearch
}

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
    categories: r.categories as string[],
  }))
}

export type GlossarySearchDocument = { id: string } & Record<string, string>
export type GlossarySearchIndex = MiniSearch<GlossarySearchDocument>
type GlossarySearchSource = Pick<
  GlossaryEntryBase,
  "slug" | "fullFormEn" | "shortForm" | "translations"
>

export function buildGlossarySearchIndex(
  entries: GlossarySearchSource[]
): GlossarySearchIndex {
  const fields = [
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

  const miniSearch = new MiniSearch<GlossarySearchDocument>({
    fields,
    storeFields: ["id", "slug", "fullFormEn", "shortForm"],
    tokenize: CJK_TOKENIZER,
    searchOptions: {
      boost: { fullFormEn: 2 },
      fuzzy: 0.2,
      prefix: true,
      tokenize: CJK_TOKENIZER,
    },
  })

  const documents: GlossarySearchDocument[] = entries.map((entry) => {
    const doc: GlossarySearchDocument = {
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
