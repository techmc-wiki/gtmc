import type { ReactNode } from "react"

import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

import { fromHtml } from "@takumi-rs/helpers/html"

import { fromJsx } from "@takumi-rs/helpers/jsx"
import type { Node } from "@takumi-rs/helpers"

import { PdfcnThemeProvider } from "@/components/pdf/theme-provider"
import { View } from "@/lib/pdf-primitives"

import { Cover, Toc } from "./cover-and-toc"
import type { BookArticle, BookPlan, PdfLocale } from "./manifest"
import { ArticleHead, ChapterOpener, Colophon } from "./sections"
import { bookStyles } from "./styles"
import { FONT_STACKS, GTMC_COLORS, gtmcTheme } from "../theme"

export interface AssembleOptions {
  plan: BookPlan
  title: string
  /** Selects the edition's furniture: cover, contents, openers, colophon. */
  locale: PdfLocale
  /** Edition label shown above the cover title, in the apparatus face. */
  edition: string
  subtitle?: string
  tagline?: string
  revision?: string
  generatedDate: string
  sourceUrl?: string
  /**
   * Rewrites article HTML in place; GIF transcoding and mermaid rendering both
   * happen before assembly. The caller owns the image bytes it collects here.
   */
  transform: (html: string) => Promise<string>
}

export type AssembledBook = {
  node: Node
  css: string[]
  articleCount: number
}

/** Stamps the internal anchor the table of contents links to. */
function anchor(node: Node, id: string): Node {
  return { ...node, id }
}

/**
 * Assembles the book into a single node tree, in reading order.
 *
 * Every piece is lowered to nodes on its own and laid end to end: cover,
 * contents, then for each chapter its opener followed by each article's head
 * immediately followed by that article's body, and the colophon last. Article
 * bodies arrive as HTML from the site pipeline; the shell around them is built
 * from pdfcn React components. Keeping everything in one ordered list is what
 * puts a body under its own head, and it also means the whole book goes
 * through a single pagination pass.
 */
export async function assembleBook(
  options: AssembleOptions
): Promise<AssembledBook> {
  const { plan, locale, transform } = options
  const parts: Node[] = []
  const css: string[] = []
  let articleCount = 0

  /**
   * Lowers one piece of the shell to nodes and queues it in reading order.
   * The lowered root is kept, not unwrapped: the style on a piece's outermost
   * element is what carries its page break, and dropping the wrapper dropped
   * every chapter opener's `breakBefore` along with it.
   */
  const append = async (element: ReactNode): Promise<void> => {
    const lowered = await fromJsx(
      <PdfcnThemeProvider theme={gtmcTheme}>{element}</PdfcnThemeProvider>
    )
    parts.push(lowered.node)
    css.push(...lowered.css)
  }

  const appendArticle = async (article: BookArticle): Promise<void> => {
    const html = await transform(article.html)
    const head = await fromJsx(
      <PdfcnThemeProvider theme={gtmcTheme}>
        <View style={bookStyles.article}>
          <ArticleHead article={article} />
        </View>
      </PdfcnThemeProvider>
    )
    // The anchor goes on the head, so a contents link lands on the article's
    // title rather than a line further down its body.
    parts.push(anchor(head.node, article.slug))
    css.push(...head.css)

    if (!html) return
    const parsed = fromHtml(html)
    parts.push(parsed.node)
    css.push(...parsed.css)
    articleCount += 1
  }

  // The cover fills its page exactly, so the contents would start on the next
  // one anyway; the explicit break states that rather than relying on it.
  await append(
    <View style={bookStyles.page}>
      <Cover
        locale={locale}
        edition={options.edition}
        title={options.title}
        subtitle={options.subtitle}
        tagline={options.tagline}
        revision={options.revision}
        sourceUrl={options.sourceUrl}
      />
    </View>
  )

  await append(
    <View style={[bookStyles.page, { breakBefore: "page" }]}>
      <Toc plan={plan} locale={locale} />
    </View>
  )

  for (const article of plan.preface) {
    await appendArticle(article)
  }

  for (const chapter of plan.chapters) {
    await append(<ChapterOpener chapter={chapter} locale={locale} />)
    for (const article of chapter.articles) {
      await appendArticle(article)
    }
  }

  await append(
    <Colophon
      locale={locale}
      revision={options.revision}
      generatedDate={options.generatedDate}
      sourceUrl={options.sourceUrl}
    />
  )

  // The page style sits on this root, so every queued part inherits the
  // reading face, the measure, and the warm paper.
  const node: Node = {
    type: "container",
    style: bookStyles.page as React.CSSProperties,
    children: parts,
  }

  return { node, css: [katexCss(), CONTENT_CSS, ...css], articleCount }
}

/**
 * KaTeX's own stylesheet, read once and memoized.
 *
 * The article sidecars are bare fragments with no stylesheet, and KaTeX's
 * visual layer is meaningless without its CSS: the vertical lists that stack
 * superscripts and fractions are positioned by `.vlist-t` / `.vlist-r`, and
 * the inline `height` on `.pstrut` is only meaningful alongside those rules.
 * Laying it out unstyled rotated and reflowed the text and ran one chapter of
 * formulas to seven hundred pages.
 */
let katexCssCache: string | null = null

function katexCss(): string {
  if (katexCssCache !== null) return katexCssCache
  const require = createRequire(import.meta.url)
  // The package's `exports` map covers its JS entry points, not its
  // stylesheet, so the file is resolved against the package directory.
  const packageDir = path.dirname(require.resolve("katex/package.json"))
  katexCssCache = readFileSync(
    path.join(packageDir, "dist", "katex.min.css"),
    "utf8"
  )
  return katexCssCache
}

/**
 * Print styles for the article bodies spliced in from the site pipeline. The
 * site's stylesheet targets a screen, where a long code line scrolls sideways;
 * a page cannot scroll, so code wraps and keeps its hanging indent. Figures and
 * tables are capped to the text column rather than running into the margin.
 */
const CONTENT_CSS = `
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: ${FONT_STACKS.mono};
  font-size: 8.5pt;
  line-height: 1.45;
  padding: 6pt 8pt;
  background-color: ${GTMC_COLORS.surface};
  border-left: 2pt solid ${GTMC_COLORS.line};
  break-inside: avoid;
}
code {
  font-family: ${FONT_STACKS.mono};
  font-size: 0.92em;
}
pre code {
  font-size: inherit;
  background: none;
  padding: 0;
  display: block;
}
/* Shiki emits one span per line and relies on the site's stylesheet to make
   them block-level. The PDF sidecars carry no stylesheet, so without this the
   whole listing collapses into one wrapping paragraph. */
pre code .line {
  display: block;
  min-height: 1em;
}
/* Image sizing is written onto each tag by the asset pipeline: the renderer
   ignores max-width and max-height on replaced elements, so a stylesheet
   cannot constrain a figure here. */
figure {
  margin: 10pt 0;
  text-align: center;
  break-inside: avoid;
}
figcaption {
  font-family: ${FONT_STACKS.mono};
  font-size: 7.5pt;
  color: ${GTMC_COLORS.ink};
  margin-top: 4pt;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  break-inside: avoid;
}
th, td {
  border: 0.5pt solid ${GTMC_COLORS.line};
  padding: 3pt 5pt;
  text-align: left;
}
th {
  background-color: ${GTMC_COLORS.surface};
  font-weight: 600;
}
blockquote {
  margin: 8pt 0;
  padding-left: 8pt;
  border-left: 2pt solid ${GTMC_COLORS.line};
  color: ${GTMC_COLORS.ink};
}
hr {
  border: none;
  border-top: 0.5pt solid ${GTMC_COLORS.line};
  margin: 12pt 0;
}
aside[data-callout] {
  break-inside: avoid;
  padding: 6pt 8pt;
  margin: 8pt 0;
  border-left: 2pt solid ${GTMC_COLORS.signal};
  background-color: ${GTMC_COLORS.surface};
}
.katex-display {
  margin: 8pt 0;
  break-inside: avoid;
}
.gif-caption, .gif-source-link {
  font-family: ${FONT_STACKS.mono};
  font-size: 7.5pt;
}
`
