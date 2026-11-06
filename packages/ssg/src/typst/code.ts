import type { Element, RootContent } from "hast"

import { ANSI_COLOR_NAMES, type AnsiColorName } from "../markdown/ansi-colors"
import { stringLiteral, typstArray } from "./escape"
import { attr, classList, textOf } from "./hast"
import type { TypstEmitError } from "./types"

export type ErrorFactory = (message: string) => TypstEmitError

/** Light-theme colours of the site's ANSI palette (`--color-ansi-*`, light block of globals.css). */
const ANSI_LIGHT: Record<AnsiColorName, string> = {
  black: "#334155",
  red: "#b91c1c",
  green: "#047857",
  yellow: "#a16207",
  blue: "#2563eb",
  magenta: "#a21caf",
  cyan: "#0f766e",
  white: "#64748b",
  "bright-black": "#0f172a",
  "bright-red": "#dc2626",
  "bright-green": "#059669",
  "bright-yellow": "#ca8a04",
  "bright-blue": "#1d4ed8",
  "bright-magenta": "#c026d3",
  "bright-cyan": "#0891b2",
  "bright-white": "#475569",
}

type FontStyle = "bold" | "italic"

interface Token {
  readonly color: string
  readonly text: string
  readonly style: FontStyle | undefined
}

interface Inherited {
  readonly color: string
  readonly style: FontStyle | undefined
}

const PLAIN: Inherited = { color: "none", style: undefined }

function isAnsiColorName(name: string): name is AnsiColorName {
  return (ANSI_COLOR_NAMES as readonly string[]).includes(name)
}

/** The colour name of an `ansi-color-<name>` element, or undefined for anything else. */
export function ansiColorOf(tagName: string): AnsiColorName | undefined {
  if (!tagName.startsWith("ansi-color-")) return undefined
  const name = tagName.slice("ansi-color-".length)
  return isAnsiColorName(name) ? name : undefined
}

/** Shiki writes `color:#rrggbb;--shiki-dark:…`; the first colour is the light theme's. */
function lightColor(style: string | undefined): string | undefined {
  const hex = /(?:^|;)\s*color:\s*(#[0-9a-fA-F]{6})\s*(?:;|$)/.exec(
    style ?? ""
  )?.[1]
  return hex === undefined ? undefined : hex.toLowerCase()
}

function fontStyleOf(style: string | undefined): FontStyle | undefined {
  if (/--shiki-light-font-weight:\s*bold/.test(style ?? "")) return "bold"
  if (/--shiki-light-font-style:\s*italic/.test(style ?? "")) return "italic"
  return undefined
}

function collectTokens(
  nodes: readonly RootContent[],
  error: ErrorFactory,
  inherited: Inherited
): Token[] {
  const tokens: Token[] = []
  for (const node of nodes) {
    if (node.type === "comment" || node.type === "doctype") continue
    if (node.type === "text") {
      if (node.value !== "") tokens.push({ ...inherited, text: node.value })
      continue
    }
    if (node.type !== "element")
      throw error("unexpected node inside highlighted code")
    if (node.tagName === "span") {
      const style = attr(node, "style")
      tokens.push(
        ...collectTokens(node.children, error, {
          color: lightColor(style) ?? inherited.color,
          style: fontStyleOf(style) ?? inherited.style,
        })
      )
      continue
    }
    const ansi = ansiColorOf(node.tagName)
    if (ansi !== undefined) {
      tokens.push(
        ...collectTokens(node.children, error, {
          color: ANSI_LIGHT[ansi],
          style: inherited.style,
        })
      )
      continue
    }
    throw error(`unexpected <${node.tagName}> inside highlighted code`)
  }
  return tokens
}

function tokenTuple(token: Token): string {
  const color = token.color === "none" ? "none" : stringLiteral(token.color)
  const fields = [color, stringLiteral(token.text)]
  if (token.style !== undefined) fields.push(stringLiteral(token.style))
  return `(${fields.join(", ")})`
}

function lineExpr(tokens: readonly Token[]): string {
  return `(${tokens.map(tokenTuple).join(", ")}${tokens.length === 1 ? "," : ""})`
}

/** Source lines of a code text. The trailing newline is not a line, as in the site's line count. */
function sourceLines(text: string): string[] {
  if (text === "") return []
  return (text.endsWith("\n") ? text.slice(0, -1) : text).split("\n")
}

function isLineSpan(node: RootContent): node is Element {
  return (
    node.type === "element" &&
    node.tagName === "span" &&
    classList(node).includes("line")
  )
}

/**
 * Shiki output (`code > span.line*`) as the `lines:` array of `#codeblock`. Shiki drops
 * blank lines, so `raw` (the fence's exact text) is the line source and spans supply colour.
 */
export function highlightedLines(
  code: Element,
  raw: string | undefined,
  error: ErrorFactory
): string {
  const spans: Element[] = []
  for (const child of code.children) {
    if (child.type === "comment") continue
    if (child.type === "text" && child.value.trim() === "") continue
    if (!isLineSpan(child))
      throw error("code contains a node that is not a Shiki line")
    spans.push(child)
  }
  const texts = spans.map((span) => textOf(span))
  const sources = raw === undefined ? texts : sourceLines(raw)
  const out: string[] = []
  if (sources.length === spans.length) {
    for (const [index, span] of spans.entries()) {
      if (sources[index] !== texts[index]) {
        throw error(
          `highlighted line ${index + 1} differs from its source: ${JSON.stringify(sources[index])} vs ${JSON.stringify(texts[index])}`
        )
      }
      out.push(lineExpr(collectTokens(span.children, error, PLAIN)))
    }
    return typstArray(out)
  }
  let next = 0
  for (const source of sources) {
    if (source === "") {
      out.push("()")
      continue
    }
    const span = spans[next]
    if (span === undefined || texts[next] !== source) {
      throw error("highlighted lines do not match their source")
    }
    out.push(lineExpr(collectTokens(span.children, error, PLAIN)))
    next++
  }
  if (next !== spans.length)
    throw error("highlighted lines do not match their source")
  return typstArray(out)
}

/** Unhighlighted code: one uncoloured line per source line. */
export function plainLines(text: string): string {
  const lines = sourceLines(text).map((line) =>
    line === "" ? "()" : `((none, ${stringLiteral(line)}),)`
  )
  return typstArray(lines)
}
