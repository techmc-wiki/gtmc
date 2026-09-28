/**
 * Removes MathML from article HTML.
 *
 * KaTeX emits each formula twice: a visual HTML layer, and a hidden MathML
 * annotation holding the original LaTeX source inside `<annotation>`. The site
 * hides that layer with a 1px clip; this renderer instead lays it out and
 * shapes it, which is expensive and demands glyphs the visual layer never
 * draws. Worse, the `<annotation>` text is typeset as ordinary body copy — one
 * chapter of formulas laid out its own source and ran to seven hundred pages.
 *
 * Stripping every `<math>` subtree, rather than only the `katex-mathml` spans,
 * covers formulas that arrive as bare MathML with no span wrapper.
 */
function stripTag(html: string, tag: string, openPattern: RegExp): string {
  const close = `</${tag}>`
  const openGlobal = new RegExp(openPattern.source, "g")

  let result = ""
  let cursor = 0

  for (;;) {
    openGlobal.lastIndex = cursor
    const match = openGlobal.exec(html)
    if (match === null) {
      result += html.slice(cursor)
      return result
    }

    const start = match.index
    result += html.slice(cursor, start)

    // Walk to the matching close tag. MathML nests arbitrarily, so the depth
    // counts both openings and closings of this tag alone.
    const openLength = match[0].length
    let depth = 0
    let index = start
    let end = html.length

    while (index < html.length) {
      const nextOpen = html.slice(index).search(openGlobal)
      const nextClose = html.indexOf(close, index)
      if (nextClose === -1) break

      const openAt = nextOpen === -1 ? -1 : index + nextOpen
      if (openAt !== -1 && openAt < nextClose) {
        depth += 1
        index = openAt + openLength
        continue
      }

      depth -= 1
      index = nextClose + close.length
      if (depth === 0) {
        end = index
        break
      }
    }

    cursor = end
  }
}

export function stripKatexMathml(html: string): string {
  return stripTag(html, "math", /<math\b[^>]*>/)
}

/**
 * Shifts an article's own headings down one level. The chapter opener supplies
 * the `h1` and the article head the `h2`, so a body's top-level sections have
 * to become `h3` for the outline to nest sections under their article rather
 * than list them as siblings. Ids are left alone, so the anchors the table of
 * contents and cross-references point at still resolve.
 */

/**
 * Drops the H1 a sidecar opens with. The article head already draws that title
 * above the body, and the site strips it from most sidecars itself; where it
 * survives — a folder introduction, for one — keeping it prints the title
 * twice. This runs before `demoteHeadings`, because demotion turns that H1
 * into an H2 and the two are then indistinguishable.
 */
export function stripLeadingTitle(html: string): string {
  return html.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, "")
}

/**
 * Shifts an article's own headings down one level. The chapter opener supplies
 * the `h1` and the article head the `h2`, so a body's top-level sections have
 * to become `h3` for the outline to nest sections under their article rather
 * than list them as siblings. Ids are left alone, so the anchors the table of
 * contents and cross-references point at still resolve.
 */
export function demoteHeadings(html: string): string {
  // Opening *and* closing tags must move together. Rewriting only the opening
  // tag leaves `<h3 …>…</h2>`, and the renderer lays malformed markup out
  // catastrophically — one chapter of these headings ran to seven hundred
  // pages of text broken a few characters per line.
  return html.replace(
    /<(\/?)h([1-5])(\s|>)/g,
    (_match, slash: string, level: string, rest: string) =>
      `<${slash}h${Number(level) + 1}${rest}`
  )
}
