import type { Element, Root, RootContent } from "hast"

import { ansiColorOf, highlightedLines, plainLines } from "./code"
import { escapeMarkup, stringLiteral, typstArray } from "./escape"
import { attr, classList, elementsOf, isIgnorable, textOf } from "./hast"
import { classifyHref } from "./links"
import { TypstEmitError, type EmitContext } from "./types"

type Parent = Root | Element
type Cell = {
  readonly header: boolean
  readonly align: string | undefined
  readonly body: string
}

const BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "pre",
  "blockquote",
  "table",
  "hr",
  "section",
  "div",
  "aside",
  "center",
  "mermaid-diagram",
  "style",
])

const CALLOUT_KINDS = new Set([
  "warning",
  "tip",
  "important",
  "crash",
  "corruption",
])
const ALIGNS = new Set(["left", "center", "right"])

const UPDATE_KINDS: Readonly<Record<string, string>> = {
  wtucolor: "wtu",
  ttcolor: "tt",
  ctcolor: "ct",
  becolor: "be",
  eucolor: "eu",
  tecolor: "te",
  atcolor: "at",
}

const INLINE_WRAPPERS: Readonly<Record<string, string>> = {
  strong: "strong",
  em: "emph",
  del: "strike",
  sup: "super",
  sub: "sub",
}

/** Typst has no colour for these; the template renders their children unchanged. */
const TEXT_WRAPPERS = new Set(["nc", "pp"])

/** GIFs are block figures wherever they appear: Typst cannot animate inline. */
function isAnimatedImage(node: RootContent): node is Element {
  return (
    node.type === "element" &&
    node.tagName === "img" &&
    /\.gif(?:[?#]|$)/i.test(attr(node, "src") ?? "")
  )
}

function isBreak(node: RootContent): boolean {
  return node.type === "element" && node.tagName === "br"
}

/** Leading and trailing breaks of a run would render as empty lines inside the paragraph. */
function trimRun(nodes: readonly RootContent[]): RootContent[] {
  let start = 0
  let end = nodes.length
  while (start < end && (isIgnorable(nodes[start]) || isBreak(nodes[start]))) {
    start++
  }
  while (
    end > start &&
    (isIgnorable(nodes[end - 1]) || isBreak(nodes[end - 1]))
  ) {
    end--
  }
  return nodes.slice(start, end)
}

/** The only element child of `el`, ignoring whitespace; undefined when there is any other content. */
function soleElement(el: Element): Element | undefined {
  const meaningful = el.children.filter((child) => !isIgnorable(child))
  const only = meaningful.length === 1 ? meaningful[0] : undefined
  return only?.type === "element" ? only : undefined
}

function alignOf(
  header: readonly Cell[],
  firstBody: readonly Cell[],
  index: number
): string {
  return header[index]?.align ?? firstBody[index]?.align ?? "left"
}

function collectFootnotes(root: Root): ReadonlyMap<string, Element> {
  const defs = new Map<string, Element>()
  const visit = (node: Root | RootContent): void => {
    if (node.type === "element" && node.tagName === "li") {
      const id = attr(node, "id")
      if (id?.startsWith("user-content-fn-")) defs.set(id, node)
    }
    if (node.type === "element" || node.type === "root") {
      for (const child of node.children) visit(child)
    }
  }
  visit(root)
  return defs
}

export class BodyEmitter {
  private readonly footnotes: ReadonlyMap<string, Element>

  constructor(
    private readonly ctx: EmitContext,
    root: Root
  ) {
    this.footnotes = collectFootnotes(root)
  }

  fail(el: Element | null, message: string): TypstEmitError {
    return new TypstEmitError(message, {
      articleSlug: this.ctx.articleSlug,
      element: el?.tagName ?? "#text",
      classes: el ? classList(el) : [],
    })
  }

  blocks(nodes: readonly RootContent[], parent: Parent): string {
    const out: string[] = []
    let run: RootContent[] = []
    const flush = (): void => {
      const text = this.inlines(trimRun(run), parent).trim()
      if (text !== "") out.push(text)
      run = []
    }
    for (const node of nodes) {
      if (node.type === "element" && BLOCK_TAGS.has(node.tagName)) {
        flush()
        const block = this.block(node, parent)
        if (block !== "") out.push(block)
      } else if (isAnimatedImage(node)) {
        flush()
        out.push(this.figure(node))
      } else {
        run.push(node)
      }
    }
    flush()
    return out.join("\n\n")
  }

  inlines(nodes: readonly RootContent[], parent: Parent): string {
    let out = ""
    for (const node of nodes) out += this.inline(node, parent)
    return out
  }

  inline(node: RootContent, parent: Parent): string {
    switch (node.type) {
      case "text":
        return escapeMarkup(node.value)
      case "comment":
      case "doctype":
        return ""
      case "element":
        return this.inlineElement(node)
      default:
        throw this.fail(
          parent.type === "element" ? parent : null,
          `unexpected ${node.type} node`
        )
    }
  }

  block(el: Element, parent: Parent): string {
    switch (el.tagName) {
      case "p":
        return this.paragraph(el)
      case "h1":
        if (
          parent.type === "root" &&
          textOf(el).trim() === this.ctx.title.trim()
        ) {
          return ""
        }
        return this.heading(el)
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        return this.heading(el)
      case "ul":
      case "ol":
        return this.list(el)
      case "pre":
        return this.pre(el)
      case "blockquote":
        return `#quote-block[${this.blocks(el.children, el)}]`
      case "table":
        return this.table(el)
      case "hr":
        return "#thematic()"
      case "aside":
        return this.aside(el)
      case "section":
        return this.section(el)
      case "div":
        return this.div(el)
      case "center":
        return `#align(center)[${this.blocks(el.children, el)}]`
      case "mermaid-diagram":
        return this.mermaid(el)
      case "style":
        // Article-local CSS. Its colour rules are carried by #upd/#bin and its layout rules by the template.
        return ""
      default:
        throw this.fail(
          el,
          `block element is not in the vocabulary (inside ${parent.type === "root" ? "article" : parent.tagName})`
        )
    }
  }

  paragraph(el: Element): string {
    const only = soleElement(el)
    if (only?.tagName === "img") return this.figure(only)
    return this.blocks(el.children, el)
  }

  heading(el: Element): string {
    const level = Number(el.tagName.slice(1))
    if (level < 2) {
      throw this.fail(el, "heading level below 2 is not in the vocabulary")
    }
    const id = attr(el, "id")
    const anchor =
      id === undefined ? "none" : stringLiteral(`${this.ctx.articleSlug}#${id}`)
    return `#sec(${level}, ${anchor})[${this.inlines(el.children, el).trim()}]`
  }

  list(el: Element): string {
    for (const child of el.children) {
      if (isIgnorable(child)) continue
      if (child.type !== "element" || child.tagName !== "li") {
        throw this.fail(el, "list contains something other than <li>")
      }
    }
    const items = elementsOf(el.children)
    const loose = items.some((item) =>
      elementsOf(item.children).some((child) => child.tagName === "p")
    )
    const bodies = items.map((item) => `[${this.blocks(item.children, item)}]`)
    const trailing = bodies.length === 1 ? "," : ""
    if (el.tagName === "ol") {
      const start = attr(el, "start")
      const first = start === undefined ? 1 : Number(start)
      if (!Number.isInteger(first)) {
        throw this.fail(el, "ol start is not an integer")
      }
      return `#enum(start: ${first}, tight: ${!loose}, ${bodies.join(", ")}${trailing})`
    }
    return `#list(tight: ${!loose}, ${bodies.join(", ")}${trailing})`
  }

  pre(el: Element): string {
    const code = elementsOf(el.children).find(
      (child) => child.tagName === "code"
    )
    if (code === undefined) throw this.fail(el, "pre without code")
    const classes = classList(code)
    if (classes.includes("language-mermaid")) {
      throw this.fail(el, "mermaid fence was not converted")
    }
    const language = classes
      .find((name) => name.startsWith("language-"))
      ?.slice("language-".length)
    if (language === "math") return this.ctx.math(textOf(code), true)
    const plain =
      language === undefined || language === "text" || language === "plaintext"
    const lang = plain || language === undefined ? "text" : language
    const label = attr(el, "data-code-label")
    const labelArg = label === undefined ? "none" : stringLiteral(label)
    const error = (message: string): TypstEmitError => this.fail(el, message)
    const highlighted = !plain && elementsOf(code.children).length > 0
    const lines = highlighted
      ? highlightedLines(code, attr(el, "data-raw-code"), error)
      : plainLines(attr(el, "data-raw-code") ?? textOf(code))
    return `#codeblock(lang: ${stringLiteral(lang)}, label: ${labelArg}, lines: ${lines})`
  }

  aside(el: Element): string {
    const kind = attr(el, "data-callout")
    if (kind === undefined || !CALLOUT_KINDS.has(kind)) {
      throw this.fail(
        el,
        `callout kind "${kind ?? ""}" is not in the vocabulary`
      )
    }
    if (attr(el, "data-callout-empty") === "true") {
      return `#callout(${stringLiteral(kind)}, [])`
    }
    return `#callout(${stringLiteral(kind)}, [${this.blocks(el.children, el)}])`
  }

  section(el: Element): string {
    if (classList(el).includes("footnotes")) return ""
    throw this.fail(el, "section is not a footnote block")
  }

  div(el: Element): string {
    if (attr(el, "data-advanced-section") === "true") {
      const heading = attr(el, "data-advanced-heading")
      const id =
        heading === undefined
          ? "none"
          : stringLiteral(`${this.ctx.articleSlug}#${heading}`)
      return `#advanced(${id})[${this.blocks(el.children, el)}]`
    }
    if (classList(el).includes("scheduled-ticks-comparison")) {
      return this.blocks(el.children, el)
    }
    throw this.fail(el, "div is not an advanced section or comparison block")
  }

  table(el: Element): string {
    const sections = elementsOf(el.children)
    for (const child of sections) {
      if (child.tagName !== "thead" && child.tagName !== "tbody") {
        throw this.fail(el, `table child <${child.tagName}>`)
      }
    }
    const headRows = sections
      .filter((child) => child.tagName === "thead")
      .flatMap((head) => this.rows(head))
    if (headRows.length > 1) {
      throw this.fail(el, "table has more than one header row")
    }
    const header = headRows[0] ?? []
    const bodyRows = sections
      .filter((child) => child.tagName === "tbody")
      .flatMap((body) => this.rows(body))
    const columns =
      header.length > 0 ? header.length : (bodyRows[0]?.length ?? 0)
    if (columns === 0) throw this.fail(el, "table has no cells")
    const align = Array.from({ length: columns }, (_, index) => {
      const value = alignOf(header, bodyRows[0] ?? [], index)
      if (!ALIGNS.has(value)) {
        throw this.fail(
          el,
          `table alignment "${value}" is not in the vocabulary`
        )
      }
      return stringLiteral(value)
    })
    const headerCells = header.map((cell) => cell.body)
    const headerArg =
      headerCells.length > 0 ? `header: ${typstArray(headerCells)}, ` : ""
    const rowArgs = bodyRows.map((row) =>
      typstArray(row.map((cell) => cell.body))
    )
    return `#tbl(align: ${typstArray(align)}, ${headerArg}rows: ${typstArray(rowArgs)})`
  }

  rows(section: Element): Cell[][] {
    const rows: Cell[][] = []
    for (const child of elementsOf(section.children)) {
      if (child.tagName !== "tr") {
        throw this.fail(section, "table section child is not <tr>")
      }
      rows.push(this.cells(child))
    }
    return rows
  }

  cells(row: Element): Cell[] {
    const cells: Cell[] = []
    for (const child of row.children) {
      if (isIgnorable(child)) continue
      if (
        child.type !== "element" ||
        (child.tagName !== "td" && child.tagName !== "th")
      ) {
        throw this.fail(row, "table row contains something other than a cell")
      }
      if (attr(child, "rowspan") !== undefined) {
        throw this.fail(child, "rowspan is not in the vocabulary")
      }
      const colspan = attr(child, "colspan")
      const content = `[${this.inlines(child.children, child).trim()}]`
      const body =
        colspan !== undefined && Number(colspan) > 1
          ? `table.cell(colspan: ${Number(colspan)})${content}`
          : content
      cells.push({
        header: child.tagName === "th",
        align: attr(child, "align"),
        body,
      })
    }
    return cells
  }

  mermaid(el: Element): string {
    const asset = this.ctx.assets.mermaid(textOf(el))
    if (asset === null) {
      throw this.fail(el, "mermaid source has no rendered asset")
    }
    return `#fig(${stringLiteral(asset.path)}, kind: "diagram")`
  }

  figure(img: Element): string {
    const src = attr(img, "src") ?? ""
    const alt = stringLiteral(attr(img, "alt") ?? "")
    const asset = this.ctx.assets.image(src)
    if (asset === null) {
      throw this.fail(img, `image ${src} has no resolved asset`)
    }
    if ("missing" in asset) {
      return `#fig-missing(alt: ${alt}, src: ${stringLiteral(asset.missing)})`
    }
    if (isAnimatedImage(img)) {
      const page = `https://techmc.wiki/${this.ctx.locale}/articles/${this.ctx.articleSlug}`
      return `#fig(${stringLiteral(asset.path)}, alt: ${alt}, kind: "animated", width: ${this.widthArg(img)}, url: ${stringLiteral(page)})`
    }
    return `#fig(${stringLiteral(asset.path)}, alt: ${alt}, kind: "image", width: ${this.widthArg(img)})`
  }

  inlineImage(img: Element): string {
    if (isAnimatedImage(img)) {
      throw this.fail(img, "animated image outside a block context")
    }
    const src = attr(img, "src") ?? ""
    const alt = stringLiteral(attr(img, "alt") ?? "")
    const asset = this.ctx.assets.image(src)
    if (asset === null) {
      throw this.fail(img, `image ${src} has no resolved asset`)
    }
    if ("missing" in asset) {
      return `#img-missing(alt: ${alt}, src: ${stringLiteral(asset.missing)})`
    }
    return `#img(${stringLiteral(asset.path)}, alt: ${alt}, width: ${this.widthArg(img)})`
  }

  /** `width`, else `data-width`, else `style="width: N%"`. Only percentages are in the vocabulary. */
  widthArg(img: Element): string {
    const style = /(?:^|;)\s*width:\s*([0-9.]+%)/.exec(
      attr(img, "style") ?? ""
    )?.[1]
    const raw = attr(img, "width") ?? attr(img, "data-width") ?? style
    if (raw === undefined) return "none"
    const percent = /^([0-9.]+)%$/.exec(raw.trim())
    if (percent === null) {
      throw this.fail(img, `unsupported image width "${raw}"`)
    }
    return stringLiteral(`${percent[1]}%`)
  }

  inlineElement(el: Element): string {
    const tag = el.tagName
    const inner = (): string => this.inlines(el.children, el)
    if (tag === "sup") {
      const ref = soleElement(el)
      if (ref?.tagName === "a" && attr(ref, "dataFootnoteRef") !== undefined) {
        return this.link(ref)
      }
    }
    const wrapper = INLINE_WRAPPERS[tag]
    if (wrapper !== undefined) return `#${wrapper}[${inner()}]`
    const update = UPDATE_KINDS[tag]
    if (update !== undefined) {
      return `#upd(${stringLiteral(update)})[${inner()}]`
    }
    const ansi = ansiColorOf(tag)
    if (ansi !== undefined) return `#ansi(${stringLiteral(ansi)})[${inner()}]`
    if (TEXT_WRAPPERS.has(tag)) return inner()
    switch (tag) {
      case "br":
        return "#linebreak()"
      case "center":
        return `#align(center)[${inner()}]`
      case "code":
        return this.inlineCode(el)
      case "a":
        return this.link(el)
      case "img":
        return this.inlineImage(el)
      case "hidden":
        return `#spoiler[${inner()}]`
      case "people-mention":
        return `#person(${stringLiteral(textOf(el).trim())})`
      case "span":
        return this.span(el)
      case "iframe":
        return this.iframe(el)
      case "litematicaviewer":
        return this.litematica(el)
      default:
        throw this.fail(el, "inline element is not in the vocabulary")
    }
  }

  inlineCode(el: Element): string {
    if (elementsOf(el.children).length > 0) {
      throw this.fail(el, "inline code contains an element")
    }
    if (classList(el).includes("language-math")) {
      return this.ctx.math(textOf(el), false)
    }
    return `#icode(${stringLiteral(textOf(el))})`
  }

  link(el: Element): string {
    const href = attr(el, "href") ?? ""
    if (attr(el, "dataFootnoteRef") !== undefined) {
      return this.footnoteRef(el, href)
    }
    if (attr(el, "dataFootnoteBackref") !== undefined) return ""
    const target = classifyHref(href, (value) =>
      this.ctx.resolveArticleLink(value)
    )
    const body = this.inlines(el.children, el)
    switch (target.kind) {
      case "anchor":
        return `#xref(${stringLiteral(`${this.ctx.articleSlug}#${target.id}`)})[${body}]`
      case "article":
        return `#xref(${stringLiteral(target.id)})[${body}]`
      case "external":
        return `#ext(${stringLiteral(target.url)})[${body}]`
      case "text":
        return body
    }
  }

  /** `a[data-footnote-ref]` becomes `#footnote[...]` with the definition's content at this reference. */
  footnoteRef(a: Element, href: string): string {
    const definition = this.footnotes.get(href.replace(/^#/, ""))
    if (definition === undefined) {
      throw this.fail(a, `footnote ${href} has no definition`)
    }
    return `#footnote[${this.blocks(definition.children, definition)}]`
  }

  span(el: Element): string {
    const classes = classList(el)
    const binary = classes.some(
      (name) => name === "binary" || name.startsWith("binary-")
    )
    if (!binary) throw this.fail(el, "span is not in the vocabulary")
    const kind = classes.includes("binary-0")
      ? "0"
      : classes.includes("binary-1")
        ? "1"
        : ""
    return `#bin(${stringLiteral(kind)})[${this.inlines(el.children, el)}]`
  }

  iframe(el: Element): string {
    const src = attr(el, "src") ?? ""
    if (!/^https?:\/\//i.test(src)) {
      throw this.fail(el, "iframe source is not http(s)")
    }
    return `#online("iframe", ${stringLiteral(src)})`
  }

  litematica(el: Element): string {
    return `#online("litematica", ${stringLiteral(attr(el, "url") ?? "")})`
  }
}
