/**
 * KaTeX emits each formula twice: a visual HTML layer and a hidden MathML
 * annotation inside `<span class="katex-mathml">`. The site hides that layer
 * with a 1px clip; the PDF renderer instead lays it out and shapes it, which
 * demands glyphs for operator names the visual layer never draws.
 *
 * Dropping the annotation leaves the rendered formula untouched and removes a
 * second, invisible copy of every equation from the layout pass.
 */
const MATHML_OPEN = '<span class="katex-mathml"'

export function stripKatexMathml(html: string): string {
  let result = ""
  let cursor = 0

  for (;;) {
    const start = html.indexOf(MATHML_OPEN, cursor)
    if (start === -1) {
      result += html.slice(cursor)
      return result
    }

    result += html.slice(cursor, start)

    // Walk the span's children to find its matching close tag. The annotation
    // nests MathML elements but no other `katex-mathml` spans, so a single
    // depth counter is enough.
    let depth = 0
    let index = start
    let end = html.length
    while (index < html.length) {
      const nextOpen = html.indexOf("<span", index)
      const nextClose = html.indexOf("</span>", index)
      if (nextClose === -1) break
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1
        index = nextOpen + "<span".length
        continue
      }
      depth -= 1
      index = nextClose + "</span>".length
      if (depth === 0) {
        end = index
        break
      }
    }

    cursor = end
  }
}
