import { Window } from "happy-dom"

/**
 * `<mermaid-diagram>` elements emitted by the content pipeline. The body is raw
 * mermaid source, HTML-escaped.
 */
const DIAGRAM_TAG = /<mermaid-diagram\b[^>]*>([\s\S]*?)<\/mermaid-diagram>/g

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
}

function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g,
    (match, body: string) => {
      if (/^#x/i.test(body)) {
        return String.fromCodePoint(parseInt(body.slice(2), 16))
      }
      if (body.startsWith("#"))
        return String.fromCodePoint(parseInt(body.slice(1), 10))
      return ENTITIES[body.toLowerCase()] ?? match
    }
  )
}

type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void
  render: (
    id: string,
    source: string,
    container?: Element
  ) => Promise<{ svg: string }>
}

interface BBoxHost extends Element {
  getBBox: () => DOMRect
}

type Box = { x: number; y: number; width: number; height: number }

function num(value: string | null): number {
  const parsed = Number.parseFloat(value ?? "")
  return Number.isFinite(parsed) ? parsed : 0
}

function union(a: Box | null, b: Box): Box {
  if (a === null) return b
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  }
}

/**
 * A rough text box: happy-dom has no font metrics, and mermaid only needs label
 * extents to be plausible.
 */
function textBox(el: Element): Box {
  const fontSize = num(el.getAttribute("font-size")) || 16
  const x = num(el.getAttribute("x"))
  const y = num(el.getAttribute("y"))
  const width = (el.textContent?.length ?? 0) * fontSize * 0.6
  return {
    x,
    y: y - fontSize,
    width: Math.max(width, fontSize),
    height: fontSize * 1.2,
  }
}

/**
 * Geometry of a single element, ignoring transforms. Mermaid emits only
 * `translate(...)` transforms, which the caller applies to whole subtrees.
 */
function ownBox(el: Element): Box | null {
  switch (el.tagName.toLowerCase()) {
    case "rect": {
      const x = num(el.getAttribute("x"))
      const y = num(el.getAttribute("y"))
      return {
        x,
        y,
        width: num(el.getAttribute("width")),
        height: num(el.getAttribute("height")),
      }
    }
    case "circle": {
      const r = num(el.getAttribute("r"))
      return {
        x: num(el.getAttribute("cx")) - r,
        y: num(el.getAttribute("cy")) - r,
        width: r * 2,
        height: r * 2,
      }
    }
    case "ellipse": {
      const rx = num(el.getAttribute("rx"))
      const ry = num(el.getAttribute("ry"))
      return {
        x: num(el.getAttribute("cx")) - rx,
        y: num(el.getAttribute("cy")) - ry,
        width: rx * 2,
        height: ry * 2,
      }
    }
    case "line": {
      const x1 = num(el.getAttribute("x1"))
      const y1 = num(el.getAttribute("y1"))
      const x2 = num(el.getAttribute("x2"))
      const y2 = num(el.getAttribute("y2"))
      return {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      }
    }
    case "text":
    case "tspan":
      return textBox(el)
    default:
      return null
  }
}

/**
 * happy-dom implements no SVG geometry, and the stub it does provide reports an
 * empty box, which collapses every mermaid diagram to a 16x16 viewBox. This
 * recursive approximation over the serialized attributes is what mermaid lays
 * its nodes out against.
 */
function elementBox(el: Element): Box | null {
  let box = ownBox(el)
  for (const child of Array.from(el.children)) {
    const childBox = elementBox(child)
    if (childBox !== null) box = union(box, childBox)
  }
  if (box === null) return null

  const translate = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(
    el.getAttribute("transform") ?? ""
  )
  if (translate) {
    box = { ...box, x: box.x + num(translate[1]), y: box.y + num(translate[2]) }
  }
  return box
}

let renderer: Promise<MermaidApi> | null = null
let diagramSeq = 0

/**
 * Mermaid renders through a DOM. happy-dom supplies one but implements no SVG
 * geometry — and the empty `getBBox` it does provide collapses every diagram to
 * a 16x16 viewBox — so the prototype is replaced with {@link elementBox}.
 */
async function mermaid(): Promise<MermaidApi> {
  renderer ??= (async () => {
    const win = new Window({ url: "https://localhost/" })

    for (const key of Object.getOwnPropertyNames(win)) {
      if (key in globalThis) continue
      try {
        Object.defineProperty(globalThis, key, {
          value: (win as unknown as Record<string, unknown>)[key],
          configurable: true,
          writable: true,
        })
      } catch {
        // Some happy-dom getters are not redefinable; mermaid does not need them.
      }
    }
    Object.defineProperty(globalThis, "window", {
      value: win,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(globalThis, "document", {
      value: win.document,
      configurable: true,
      writable: true,
    })

    // happy-dom puts its (always empty) `getBBox` on `SVGGraphicsElement`, one
    // level below `SVGElement`; patch both so no SVG class keeps a stub.
    const getBBox = function getBBox(this: Element) {
      return (elementBox(this) ?? {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      }) as DOMRect
    }
    for (const ctor of [win.SVGElement, win.SVGGraphicsElement]) {
      if (ctor) (ctor.prototype as unknown as BBoxHost).getBBox = getBBox
    }

    // Imported only after the globals above exist: mermaid captures the document
    // at module-evaluation time.
    const api = (await import("mermaid")).default
    // `loose` is deliberate, not lax: at every other level mermaid runs the
    // serialized SVG through DOMPurify, which drops the entire tree under
    // happy-dom. The markup is never mounted in a page and comes from our own
    // content, so there is no untrusted script path to close.
    api.initialize({
      startOnLoad: false,
      theme: "neutral",
      securityLevel: "loose",
    })
    return api as MermaidApi
  })()

  return renderer
}

/**
 * Turn mermaid's SVG into markup takumi can lay out: drop `<foreignObject>`
 * subtrees (HTML inside SVG, which no PDF backend measures) and re-root the
 * element with a `viewBox` plus explicit pixel dimensions.
 */
function toInlineSvg(svg: string): string {
  const body = svg
    .replace(/<foreignObject\b[\s\S]*?<\/foreignObject>/g, "")
    .replace(/<foreignObject\b[^>]*\/>/g, "")

  const root = /<svg\b([^>]*)>/.exec(body)
  if (root === null) throw new Error("mermaid produced no <svg> root element")

  const raw = /\bviewBox\s*=\s*"([^"]*)"/.exec(root[1] ?? "")?.[1] ?? ""
  const [x, y, vbW, vbH] = raw
    .split(/\s+/)
    .map((part) => Number.parseFloat(part))
    .map((part) => (Number.isFinite(part) ? Math.round(part * 100) / 100 : 0))

  // Mermaid reports 0x0 bounds when the DOM has no SVG geometry, so a diagram
  // must never come back degenerate.
  const width = vbW !== undefined && vbW > 0 ? vbW : 800
  const height = vbH !== undefined && vbH > 0 ? vbH : 600

  const open =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x ?? 0} ${y ?? 0} ${width} ${height}" ` +
    `width="${Math.round(width)}" height="${Math.round(height)}" ` +
    `style="display:block;margin:1em auto;max-width:100%;height:auto">`

  return open + body.slice(root.index + root[0].length)
}

export interface RenderedDiagrams {
  /** HTML with every successfully rendered diagram replaced by inline `<svg>`. */
  html: string
  rendered: number
  /** First line of each source that could not be rendered; those stay as-is. */
  failed: string[]
}

/**
 * Replace every `<mermaid-diagram>` element in the article HTML with inline SVG.
 * A diagram that fails to render is left untouched and reported, never thrown.
 */
export async function renderMermaidDiagrams(
  html: string
): Promise<RenderedDiagrams> {
  const tags = [...html.matchAll(DIAGRAM_TAG)]
  if (tags.length === 0) return { html, rendered: 0, failed: [] }

  const api = await mermaid()
  const doc = globalThis.document
  const failed: string[] = []
  const replacements: string[] = []
  let rendered = 0

  for (const tag of tags) {
    const source = decodeEntities(tag[1] ?? "").trim()
    const label = source.split("\n")[0] ?? ""
    // A fresh container per diagram: mermaid only serializes the SVG it appended
    // to the element it was handed, and reusing `body` yields an empty string.
    const container = doc.createElement("div")
    doc.body.appendChild(container)
    const id = `gtmc-mermaid-${(diagramSeq += 1)}`
    try {
      const { svg } = await api.render(id, source, container)
      if (svg.length === 0) throw new Error("mermaid returned an empty svg")
      replacements.push(toInlineSvg(svg))
      rendered += 1
    } catch (error) {
      console.warn(`[mermaid] ${label}: ${String(error)}`)
      replacements.push(tag[0])
      failed.push(label)
    } finally {
      container.remove()
    }
  }

  let out = ""
  let cursor = 0
  for (const [index, tag] of tags.entries()) {
    out += html.slice(cursor, tag.index) + (replacements[index] ?? tag[0])
    cursor = tag.index + tag[0].length
  }
  out += html.slice(cursor)

  return { html: out, rendered, failed }
}
