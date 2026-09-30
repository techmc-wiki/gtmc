/**
 * Typesets every formula to SVG and hands the renderer an image.
 *
 * The site renders math with KaTeX, which emits nested tables, absolutely
 * positioned vlists, and inline SVG for every stretchy delimiter — machinery
 * written for a browser's inline layout. This renderer is not a browser: it
 * supports a block layout plus flex and grid, and it lays a formula out one
 * token per line, which turns a fraction into a numerator above a denominator
 * and a subscript into a paragraph of its own. The markup arrives in the
 * sidecar with the original TeX in a MathML annotation, so the source is
 * recovered here and re-typeset by MathJax, which emits one self-contained
 * drawing per formula.
 *
 * Doing it this way also ends the dependency on the KaTeX webfonts: the glyphs
 * are outlines in the drawing, so nothing has to be subsetted or embedded.
 */

import { createHash } from "node:crypto"

import "@mathjax/src/js/input/tex/ams/AmsConfiguration.js"
import { liteAdaptor } from "@mathjax/src/js/adaptors/liteAdaptor.js"
import { RegisterHTMLHandler } from "@mathjax/src/js/handlers/html.js"
import { TeX } from "@mathjax/src/js/input/tex.js"
import { mathjax } from "@mathjax/src/js/mathjax.js"
import { SVG } from "@mathjax/src/js/output/svg.js"

import { COLUMN_WIDTH } from "../geometry"
import { BODY_FONT_SIZE_PT, GTMC_COLORS } from "../theme"
import type { ImageSource } from "./images"

export interface PreparedMath {
  html: string
  images: ImageSource[]
}

/** Points are CSS pixels at 96 dpi, which is the density the renderer works in. */
const PT_TO_PX = 96 / 72

/** Math is set at the size of the copy it sits in, so an `em` is a body em. */
const MATH_EM_PX = BODY_FONT_SIZE_PT * PT_TO_PX

/** MathJax measures a drawing in thousandths of an em. */
const UNITS_PER_EM = 1000

const KATEX_SPAN = /<span class="katex">/g
const KATEX_DISPLAY_OPEN = '<span class="katex-display">'
const TEX_ANNOTATION =
  /<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/
const SPAN_CLOSE_LENGTH = "</span>".length
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
}

/** The TeX source arrives HTML-escaped inside the annotation. */
function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g,
    (match, name: string) => {
      if (!name.startsWith("#")) return NAMED_ENTITIES[name] ?? match
      const code =
        name[1] === "x"
          ? Number.parseInt(name.slice(2), 16)
          : Number.parseInt(name.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    },
  )
}

/**
 * The end of the `<span class="katex">` subtree, by span depth. KaTeX nests its
 * own markup deeply and the subtree is machine-generated, so counting open and
 * close tags finds its end exactly.
 */
function endOfSubtree(html: string, start: number): number {
  const open = /<span\b/g
  const close = /<\/span>/g
  let depth = 0
  let cursor = start
  for (;;) {
    open.lastIndex = cursor
    close.lastIndex = cursor
    const nextOpen = open.exec(html)
    const nextClose = close.exec(html)
    if (nextClose === null) return -1
    if (nextOpen !== null && nextOpen.index < nextClose.index) {
      depth += 1
      cursor = nextOpen.index + 1
      continue
    }
    depth -= 1
    cursor = nextClose.index + SPAN_CLOSE_LENGTH
    if (depth === 0) return cursor
  }
}

/**
 * The first complete `<svg>` element in a MathJax container. A long display
 * equation is broken into sibling drawings joined by `<mjx-break>` spacers, and
 * a stretchy delimiter is a nested drawing, so the end is found by depth rather
 * than by the next `</svg>`.
 */
function firstSvg(markup: string): string {
  const start = markup.indexOf("<svg")
  if (start < 0) return ""
  const open = /<svg\b/g
  const close = /<\/svg>/g
  let depth = 0
  let cursor = start
  for (;;) {
    open.lastIndex = cursor
    close.lastIndex = cursor
    const nextOpen = open.exec(markup)
    const nextClose = close.exec(markup)
    if (nextClose === null) return ""
    if (nextOpen !== null && nextOpen.index < nextClose.index) {
      depth += 1
      cursor = nextOpen.index + 4
      continue
    }
    depth -= 1
    cursor = nextClose.index + 6
    if (depth === 0) return markup.slice(start, cursor)
  }
}

interface Typeset {
  /** Self-contained SVG, sized in pixels. */
  svg: string
  width: number
  height: number
  /** How far the bottom of the drawing sits below the text baseline, in em. */
  depth: number
}

const adaptor = liteAdaptor()
RegisterHTMLHandler(adaptor)

let mathDocument: ReturnType<typeof mathjax.document> | null = null

function typeset(tex: string, display: boolean): Typeset | null {
  mathDocument ??= mathjax.document("", {
    // `ams` carries `\text`, `cases`, `aligned`, and the equation `\tag`.
    InputJax: new TeX({ packages: ["base", "ams"] }),
    // Glyphs are repeated as paths rather than referenced from a font cache,
    // because the renderer's SVG parser resolves no `<use>` references.
    OutputJax: new SVG({ fontCache: "none" }),
  })

  const svg = firstSvg(adaptor.innerHTML(mathDocument.convert(tex, { display })))
  const box = /viewBox="([^"]+)"|data-mjx-viewBox="([^"]+)"/.exec(svg)
  const numbers = (box?.[1] ?? box?.[2])?.trim().split(/[\s,]+/).map(Number)
  if (
    numbers?.length !== 4 ||
    numbers.some((n) => !Number.isFinite(n)) ||
    svg.includes('data-mjx-error="')
  ) {
    return null
  }

  const [minX = 0, minY = 0, boxWidth = 0, boxHeight = 0] = numbers
  // A display equation wider than the column is scaled down rather than
  // allowed to run into the margin: at body size a long derivation still reads
  // a little smaller, and one clipped at the page edge does not read at all.
  const natural = (boxWidth / UNITS_PER_EM) * MATH_EM_PX
  const em = MATH_EM_PX * (display && natural > COLUMN_WIDTH ? COLUMN_WIDTH / natural : 1)
  const width = Math.max(1, Math.round((boxWidth / UNITS_PER_EM) * em))
  const height = Math.max(1, Math.round((boxHeight / UNITS_PER_EM) * em))
  // MathJax sets a drawing with the bottom of its box on the baseline, so the
  // vertical alignment to reproduce is the part of the box below the baseline.
  const depth = -(minY + boxHeight) / UNITS_PER_EM
  // MathJax states the box in the user space the formula was laid out on and
  // draws into it through a transform of its own, so the box is kept as stated.
  const body = svg
    .replaceAll("currentColor", GTMC_COLORS.ink)
    .replace(/\sdata-(?:c|mml-node|latex)="[^"]*"/g, "")

  return {
    svg:
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
      `viewBox="${numbers.join(" ")}">` +
      body.replace(/^<svg\b[^>]*>/, ""),
    width,
    height,
    depth,
  }
}

const cache = new Map<string, Typeset | null>()

/** The TeX source, as an attribute value. */
function alt(tex: string): string {
  return tex
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replace(/\s+/g, " ")
}

const TAG = /\\tag\{([^}]*)\}/

/**
 * The equation number is taken off the source and drawn on its own.
 *
 * MathJax sets a numbered equation as a table whose label sits in a second
 * nested viewport, and the renderer lays a nested viewport out as though it
 * were the whole drawing — the equation collapses onto a strip one unit wide.
 * A number drawn as a second image beside the formula says the same thing and
 * leaves the equation in the plain geometry the renderer handles.
 */
function splitTag(tex: string): { body: string; tag: string | null } {
  const match = TAG.exec(tex)
  if (match === null) return { body: tex, tag: null }
  return {
    body: tex.replace(match[0], "").trim(),
    tag: match[1]?.trim() || null,
  }
}

/**
 * A drawing as an image. An inline one is seated on the text baseline by the
 * depth its own box drops below it; a display one is a flex row item, where
 * the row does the placing.
 */
function image(
  key: string,
  drawn: Typeset,
  described: string,
  className: string,
  inline: boolean,
): string {
  const seat = inline ? ` style="vertical-align: ${drawn.depth.toFixed(3)}em"` : ""
  return (
    `<img class="${className}" src="math-${digest(key)}.svg" ` +
    `width="${drawn.width}" height="${drawn.height}" alt="${alt(described)}"${seat} />`
  )
}

function digest(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 16)
}

/**
 * Replaces every KaTeX span with the drawing of its own source: the display
 * wrapper goes too, and what is left is a centred block holding the equation
 * and its number, or a single image sitting on the baseline of the sentence it
 * was written in.
 */
export function prepareMath(html: string): PreparedMath {
  const images: ImageSource[] = []
  const failed: string[] = []
  let cursor = 0
  let result = ""

  for (;;) {
    KATEX_SPAN.lastIndex = cursor
    const match = KATEX_SPAN.exec(html)
    if (match === null) break
    const open = match.index
    const end = endOfSubtree(html, open)
    if (end < 0) break

    const annotation = TEX_ANNOTATION.exec(html.slice(open, end))?.[1]
    if (annotation === undefined) {
      cursor = open + match[0].length
      continue
    }

    const display = html.slice(0, open).endsWith(KATEX_DISPLAY_OPEN)
    // The display wrapper is a `<span>` around the formula's own span; the
    // opening tag is dropped with the markup it frames, so its close has to
    // go with it or the parser is handed a tag that opens nothing.
    const start = display ? open - KATEX_DISPLAY_OPEN.length : open
    const stop = display && html.startsWith("</span>", end) ? end + SPAN_CLOSE_LENGTH : end
    const { body, tag } = splitTag(decodeEntities(annotation))

    const drawing = cached(body, display)
    const number = tag === null ? null : cached(`\\text{(${tag})}`, false)
    if (drawing === null || (tag !== null && number === null)) {
      // A formula MathJax cannot read is a problem with the article, not a
      // reason to ship a broken book: it is reported and left in place.
      failed.push(body)
      cursor = stop
      continue
    }

    const key = `${display ? "D" : "I"}${body}`
    images.push({ src: `math-${digest(key)}.svg`, data: encode(drawing) })
    let markup = image(key, drawing, body, display ? "math" : "math math-inline", !display)
    if (display) {
      if (number !== null) {
        images.push({
          src: `math-${digest(`tag${tag}`)}.svg`,
          data: encode(number),
        })
        markup =
          `<div class="math-eqn">${markup}` +
          image(`tag${tag}`, number, `(${tag})`, "math math-tag", false) +
          `</div>`
      } else {
        markup = `<div class="math-eqn">${markup}</div>`
      }
    }

    result += html.slice(cursor, start) + markup
    cursor = stop
  }

  if (failed.length > 0) {
    throw new Error(
      `MathJax could not typeset ${failed.length} formula(s), first: ${failed[0]?.slice(0, 80)}`
    )
  }

  return { html: result + html.slice(cursor), images }
}

function cached(tex: string, display: boolean): Typeset | null {
  const key = `${display ? "D" : "I"}${tex}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const drawing = typeset(tex, display)
  cache.set(key, drawing)
  return drawing
}

function encode(drawing: Typeset): Uint8Array {
  return new TextEncoder().encode(drawing.svg)
}
