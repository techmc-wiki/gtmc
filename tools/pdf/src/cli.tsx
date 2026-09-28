import fs from "node:fs"
import path from "node:path"

import { PdfRenderer } from "takumi-pdf"

import {
  prepareImages,
  renderMermaidDiagrams,
  stripKatexMathml,
} from "./assets"
import type { ImageSource } from "./assets/images"
import { assembleBook } from "./book/assemble"
import { articlesRevision, bookCopy, SOURCE_URL } from "./book/copy"
import { buildPlan, readManifest } from "./book/manifest"
import type { PdfLocale } from "./book/manifest"
import { loadFonts, trimToContent } from "./fonts"
import { GTMC_COLORS } from "./theme"
import { siteRoot } from "./workspace"

interface CliOptions {
  locale: PdfLocale | "all"
  output: string
}

function parseArgs(argv: string[]): CliOptions {
  let locale: PdfLocale | "all" = "all"
  let output = path.join(siteRoot(), "data", "pdf-dist")

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const value = argv[index + 1]
    if (arg === "--locale" && value) {
      const next = value.toLowerCase()
      if (next === "en" || next === "zh" || next === "all") locale = next
      index += 1
    } else if (arg === "--output" && value) {
      output = path.resolve(process.cwd(), value)
      index += 1
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        "usage: gtmc-pdf [--locale en|zh|all] [--output <dir-or-file>]\n"
      )
      process.exit(0)
    }
  }

  return { locale, output }
}

/**
 * Page count for the CI sanity check. Counting `/Type /Page` objects matches
 * what a reader reports and keeps the sidecar free of a PDF parsing
 * dependency; the trailing `s` guard skips the `/Type /Pages` tree node.
 */
function countPages(file: string): number {
  const raw = fs.readFileSync(file, "latin1")
  return (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length
}

function runPagesCommand(target: string): void {
  const stats = fs.statSync(target)
  process.stdout.write(
    `${JSON.stringify({ pages: countPages(target), bytes: stats.size })}\n`
  )
}

function outputPath(output: string, locale: PdfLocale): string {
  if (output.endsWith(".pdf")) return output
  return path.join(output, `gtmc-${locale}.pdf`)
}

const started = Date.now()

async function buildLocale(locale: PdfLocale, output: string): Promise<void> {
  const manifest = readManifest()
  const plan = buildPlan(manifest, locale)
  const copy = bookCopy(locale)
  const revision = articlesRevision()

  const articleCount =
    plan.preface.length +
    plan.chapters.reduce((total, chapter) => total + chapter.articles.length, 0)
  process.stdout.write(
    `[pdf] ${locale}: ${plan.chapters.length} chapters, ${articleCount} articles\n`
  )

  // Images are collected across every article and keyed by the exact `src` the
  // HTML references, so a diagram shared by two chapters is embedded once.
  const images = new Map<string, ImageSource>()
  const missing = new Set<string>()
  const unreadable = new Set<string>()
  let gifBytesBefore = 0
  let gifBytesAfter = 0
  let diagramsRendered = 0
  const diagramFailures: string[] = []

  const book = await assembleBook({
    plan,
    title: copy.bookTitle,
    edition: copy.edition,
    subtitle: copy.bookSubtitle,
    tagline: copy.slogan,
    revision,
    generatedDate: new Date().toISOString().slice(0, 10),
    sourceUrl: SOURCE_URL,
    transform: async (html) => {
      const withDiagrams = await renderMermaidDiagrams(stripKatexMathml(html))
      diagramsRendered += withDiagrams.rendered
      diagramFailures.push(...withDiagrams.failed)
      const prepared = await prepareImages(withDiagrams.html)
      for (const image of prepared.images) {
        if (!images.has(image.src)) images.set(image.src, image)
      }
      for (const src of prepared.missing) missing.add(src)
      for (const src of prepared.unreadable) unreadable.add(src)
      for (const converted of prepared.converted) {
        gifBytesBefore += converted.fromBytes
        gifBytesAfter += converted.toBytes
      }
      return prepared.html
    },
  })

  process.stdout.write(
    `[pdf] ${locale}: ${diagramsRendered} diagrams, ${images.size} images` +
      (gifBytesBefore > 0
        ? `, ${(gifBytesBefore / 1048576).toFixed(1)} MiB GIF -> ` +
          `${(gifBytesAfter / 1048576).toFixed(1)} MiB WebP`
        : "") +
      "\n"
  )
  if (diagramFailures.length > 0) {
    process.stdout.write(
      `[pdf] ${locale}: ${diagramFailures.length} diagram(s) fell back to source\n`
    )
  }
  if (missing.size > 0) {
    process.stdout.write(
      `[pdf] ${locale}: ${missing.size} image(s) absent from the articles tree: ` +
        `${[...missing].slice(0, 3).join(", ")}${missing.size > 3 ? ", …" : ""}\n`
    )
  }
  if (unreadable.size > 0) {
    process.stdout.write(
      `[pdf] ${locale}: ${unreadable.size} image(s) present but undecodable: ` +
        `${[...unreadable].slice(0, 3).join(", ")}${unreadable.size > 3 ? ", …" : ""}\n`
    )
  }

  const catalog = await loadFonts(locale)
  const fonts = trimToContent(catalog, book.node)

  const renderStart = performance.now()
  const pdf = await new PdfRenderer().render(book.node, {
    size: "a4",
    lang: locale === "zh" ? "zh-Hans" : "en",
    margin: { top: 56, right: 60, bottom: 64, left: 60 },
    backgroundColor: "#f5f4ef",
    css: book.css,
    fonts,
    fontFamilies: catalog.families,
    images: [...images.values()],
    outline: true,
    uncoveredText: "error",
    metadata: {
      title: `${copy.bookTitle} — ${copy.bookSubtitle}`,
      description:
        "The complete Graduate Texts in Minecraft, for offline reading.",
      creator: "techmc-wiki/gtmc",
      // The renderer wants a bare UTC stamp: no milliseconds, no zone suffix.
      ...(revision
        ? { creationDate: new Date().toISOString().slice(0, 19) }
        : {}),
    },
    // The running head carries the book title, so it is set in the sans face at
    // sentence case. A full-capital monospace wordmark repeated on every page
    // is a label pretending to be a name; the folio below it stays monospace
    // because that is genuine apparatus.
    header: (
      <div
        style={{
          width: "100%",
          fontFamily: '"Geist", "Noto Sans SC", sans-serif',
          fontSize: 7.5,
          color: GTMC_COLORS.ink,
        }}>
        <span>{copy.bookTitle}</span>
      </div>
    ),
    footer: (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          fontFamily: '"Geist Mono", "Noto Sans SC", monospace',
          fontSize: 7,
          color: "#4a5468",
        }}>
        <span className="pageNumber" />
      </div>
    ),
  })

  const target = outputPath(output, locale)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, pdf)

  process.stdout.write(
    `[pdf] ${locale}: ${(pdf.length / 1048576).toFixed(2)} MiB, ` +
      `${Math.round(performance.now() - renderStart)} ms -> ${target}\n`
  )
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)

  if (argv[0] === "pages") {
    const target = argv[1]
    if (!target) {
      process.stderr.write("usage: gtmc-pdf pages <file.pdf>\n")
      process.exit(1)
    }
    runPagesCommand(target)
    return
  }

  const { locale, output } = parseArgs(argv)
  const locales: PdfLocale[] = locale === "all" ? ["en", "zh"] : [locale]

  for (const each of locales) {
    await buildLocale(each, output)
  }

  process.stdout.write(
    `[pdf] done in ${((Date.now() - started) / 1000).toFixed(1)}s\n`
  )
}

await main()
