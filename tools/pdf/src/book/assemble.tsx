import { fromHtml } from "@takumi-rs/helpers/html"
import { fromJsx } from "@takumi-rs/helpers/jsx"
import type { Node } from "@takumi-rs/helpers"

import { PdfcnThemeProvider } from "@/components/pdf/theme-provider"
import { View } from "@/lib/pdf-primitives"

import { Cover, Toc } from "./cover-and-toc"
import type { BookArticle, BookPlan } from "./manifest"
import { ArticleHead, ChapterOpener, Colophon } from "./sections"
import { bookStyles } from "./styles"
import { FONT_STACKS, GTMC_COLORS, gtmcTheme } from "../theme"

export interface AssembleOptions {
  plan: BookPlan
  title: string
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

/** Children of a node, or none when the node carries no child list. */
function childrenOf(node: Node): Node[] {
  return node.type === "container" ? (node.children ?? []) : []
}

/** Stamps the internal anchor the table of contents links to. */
function anchor(node: Node, id: string): Node {
  return { ...node, id }
}

/**
 * Article HTML opens with an H1 that duplicates the head already drawn above
 * it. Dropping it keeps one heading per article, so the outline stays a
 * chapter/article tree rather than repeating every title.
 */
function stripLeadingHeading(node: Node): Node {
  if (node.type !== "container") return node
  const children = childrenOf(node)
  const first = children[0]
  if (first && first.type === "container" && first.tagName === "h1") {
    return { ...node, children: children.slice(1) }
  }
  return node
}

/**
 * Assembles the book into a single node tree.
 *
 * The shell — cover, contents, chapter openers, article heads, colophon — is
 * built from pdfcn React components and lowered to nodes. Article bodies arrive
 * as HTML from the site pipeline and are parsed into nodes the shell is spliced
 * onto, so the whole book goes through one pagination pass.
 */
export async function assembleBook(
  options: AssembleOptions
): Promise<AssembledBook> {
  const { plan, transform } = options

  const shell = await fromJsx(
    <PdfcnThemeProvider theme={gtmcTheme}>
      <View style={bookStyles.page}>
        <Cover
          edition={options.edition}
          title={options.title}
          subtitle={options.subtitle}
          tagline={options.tagline}
          revision={options.revision}
          sourceUrl={options.sourceUrl}
        />
        <Toc plan={plan} />
        {plan.preface.map((article) => (
          <View key={article.slug} style={bookStyles.article}>
            <ArticleHead article={article} />
          </View>
        ))}
        {plan.chapters.map((chapter) => (
          <View key={chapter.slug}>
            <ChapterOpener chapter={chapter} />
            {chapter.articles.map((article) => (
              <View key={article.slug} style={bookStyles.article}>
                <ArticleHead article={article} />
              </View>
            ))}
          </View>
        ))}
        <Colophon
          revision={options.revision}
          generatedDate={options.generatedDate}
          sourceUrl={options.sourceUrl}
        />
      </View>
    </PdfcnThemeProvider>
  )

  const bodies: Node[] = []
  const css = [...shell.css]
  let articleCount = 0

  const all: BookArticle[] = [
    ...plan.preface,
    ...plan.chapters.flatMap((chapter) => chapter.articles),
  ]

  for (const article of all) {
    const html = await transform(article.html)
    if (!html) continue
    const parsed = fromHtml(html)
    css.push(...parsed.css)
    bodies.push(anchor(stripLeadingHeading(parsed.node), article.slug))
    articleCount += 1
  }

  const node: Node = {
    type: "container",
    children: [...childrenOf(shell.node), ...bodies],
  }

  return { node, css: [CONTENT_CSS, ...css], articleCount }
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
img, svg {
  max-width: 100%;
  height: auto;
}
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
