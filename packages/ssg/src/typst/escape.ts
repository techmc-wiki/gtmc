const MARKUP_SPECIAL = new Set([
  "\\",
  "#",
  "$",
  "*",
  "_",
  "@",
  "<",
  ">",
  "[",
  "]",
  "(",
  ")",
  "{",
  "}",
  "`",
  "~",
  "-",
  "+",
  "/",
  "=",
  ".",
])

/** Text for Typst markup. Line breaks in source text are spaces, as in Markdown. */
export function escapeMarkup(text: string): string {
  let out = ""
  for (const ch of text) {
    if (ch === "\n" || ch === "\r") out += " "
    else out += MARKUP_SPECIAL.has(ch) ? `\\${ch}` : ch
  }
  return out
}

export function stringLiteral(value: string): string {
  const escaped = value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t")
  return `"${escaped}"`
}

/** Typst array literal; the trailing comma keeps one item from becoming a parenthesised value. */
export function typstArray(items: readonly string[]): string {
  return items.length === 0 ? "()" : `(${items.join(", ")},)`
}

/** Percent-decoding that leaves malformed sequences untouched. */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
