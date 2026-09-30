/**
 * Article HTML arrives from the site pipeline with its headings at the depth
 * the site uses and its formulas as KaTeX markup. The heading transforms below
 * fit the body into the book's own structure; the formulas are dealt with by
 * `prepareMath`, which replaces every one of them before this runs.
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
