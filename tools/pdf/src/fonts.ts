import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"

import { googleFonts, subsetFonts } from "@takumi-rs/helpers"
import type { FontLoader } from "@takumi-rs/helpers/renderer"
import type { GoogleFontFamily } from "@takumi-rs/helpers"

import type { PdfLocale } from "./book/manifest"

/**
 * A Chrome user agent is required: Google Fonts serves woff2 only to browsers
 * it recognises and answers with legacy TTF otherwise.
 */
const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

/** Latin reading face, apparatus face, and code face. */
const LATIN_FAMILIES = [
  {
    name: "STIX Two Text",
    weight: [400, 600, 700],
    style: ["normal", "italic"],
  },
  { name: "Geist", weight: [400, 500, 600] },
  { name: "Geist Mono", weight: [400, 700], generic: "monospace" },
]

/**
 * The Chinese edition's faces. Loaded for every locale, not just `zh`: the
 * English articles carry CJK too, in block and item names that stay
 * untranslated, and the renderer has no cross-family fallback to cover them.
 */
const CJK_FAMILIES = [
  { name: "Noto Serif SC", weight: [400, 600, 700] },
  { name: "Noto Sans SC", weight: [400, 500, 700] },
]

/**
 * Last-resort coverage. The SC families advertise codepoints their subsets do
 * not actually carry — U+207B SUPERSCRIPT MINUS, used once in the entity
 * motion chapter, is one — and the renderer resolves an uncovered codepoint
 * against this chain alone. Plain Noto Serif closes those gaps and matches the
 * reading face closely enough to pass unnoticed.
 */
const COVERAGE_FAMILIES = [{ name: "Noto Serif", weight: [400] }]

/**
 * KaTeX splits its alphabet across twelve families, and math is set entirely in
 * them. The renderer resolves an uncovered codepoint only against the
 * registered families, so a missed one fails the render outright.
 */
function loadKatexFonts(): { faces: FontLoader[]; families: string[] } {
  const require = createRequire(import.meta.url)
  const fontDir = path.join(path.dirname(require.resolve("katex")), "fonts")
  const faces: FontLoader[] = []
  const families = new Set<string>()

  for (const entry of fs.readdirSync(fontDir)) {
    // Family names carry digits: KaTeX_Size1 … KaTeX_Size4 hold the stretchy
    // delimiter pieces, the overline, and the superscript minus.
    const match = /^KaTeX_([A-Za-z0-9]+)-([A-Za-z]+)\.ttf$/.exec(entry)
    if (!match) continue
    const [, family = "", variant = ""] = match
    const weight = variant === "Bold" ? 700 : 400
    const style = variant.endsWith("Italic") ? "italic" : "normal"
    // One face per family name keeps the renderer's family lookup
    // unambiguous; the style axis rides on `weight` and `style`.
    const name = `KaTeX_${family}_${weight}${style === "italic" ? "i" : ""}`
    faces.push({
      name,
      // `subsetOf` keeps the four styles of a family distinct while letting
      // `font-family: KaTeX_Main` in the chain expand across all of them.
      subsetOf: `KaTeX_${family}`,
      data: () => Promise.resolve(fs.readFileSync(path.join(fontDir, entry))),
      weight,
      style,
    })
    families.add(`KaTeX_${family}`)
  }

  return { faces, families: [...families].sort() }
}

export type FontCatalog = {
  faces: FontLoader[]
  /**
   * The fallback chain. A browser falls back per glyph across its webfonts;
   * this renderer does not, so every script the book sets must appear here in
   * priority order or the render fails naming the missing character.
   */
  families: string[]
}

const cache = new Map<PdfLocale, FontCatalog>()

export async function loadFonts(locale: PdfLocale): Promise<FontCatalog> {
  const hit = cache.get(locale)
  if (hit) return hit

  const google = await googleFonts({
    families: [
      ...LATIN_FAMILIES,
      ...CJK_FAMILIES,
      ...COVERAGE_FAMILIES,
    ] as GoogleFontFamily[],
    fetch: (input, init) =>
      fetch(input, {
        ...init,
        headers: { ...init?.headers, "User-Agent": CHROME_UA },
      }),
  })

  const katex = loadKatexFonts()
  const catalog: FontCatalog = {
    faces: [...google, ...katex.faces],
    families: [
      "STIX Two Text",
      "Geist",
      "Geist Mono",
      "Noto Serif SC",
      "Noto Sans SC",
      "Noto Serif",
      ...katex.families,
    ],
  }
  cache.set(locale, catalog)
  return catalog
}

/**
 * Drops the coverage subsets the content never reaches. The Chinese edition
 * draws on a few thousand of the ~120k codepoints the SC families declare, and
 * every subset kept is embedded in the output.
 */
export function trimToContent(
  catalog: FontCatalog,
  source: Parameters<typeof subsetFonts>[0]["source"]
): FontLoader[] {
  return subsetFonts({ fonts: catalog.faces, source })
}
