// Visual constants for the book. Colours come from the site's tokens
// (work/tokens.typ, generated from app/globals.css); everything else is
// typographic geometry owned here.
#import "/work/tokens.typ": tokens

// Page is white. Ink is the site's emphasis colour, not its softer body colour:
// mid-grey body text loses contrast on paper.
#let ink = tokens.main-dark
#let ink-soft = tokens.main
#let hairline = tokens.line
#let signal = tokens.signal
#let advanced-color = tokens.advanced
#let wash = tokens.main-dark.transparentize(94%)
#let wash-strong = tokens.main-dark.transparentize(88%)

#let fonts = (
  sans: ("Geist", "Noto Sans SC"),
  serif: ("STIX Two Text", "Noto Serif SC"),
  mono: ("Geist Mono", "Noto Sans SC"),
)

// The six canonical styles of DESIGN.md, translated to print sizes.
#let size = (
  body: 10pt,
  small: 8.6pt,
  apparatus: 7.2pt,
  code: 8pt,
  section: 14.5pt,
  subsection: 11.5pt,
  article: 22pt,
  chapter: 32pt,
)

// Callout semantics follow the site's palette (callout-aside.tsx):
// rule uses the 500 shade, the label the 700 shade for print contrast.
#let callout-colors = (
  warning: (rule: rgb("#f59e0b"), label: rgb("#b45309")),
  tip: (rule: rgb("#10b981"), label: rgb("#047857")),
  important: (rule: rgb("#3b82f6"), label: rgb("#1d4ed8")),
  crash: (rule: rgb("#ef4444"), label: rgb("#b91c1c")),
  corruption: (rule: rgb("#f97316"), label: rgb("#c2410c")),
)

// Update-type colouring used in prose (`<wtucolor>` etc.), darkened to hold
// 5:1 contrast on white.
#let update-colors = (
  wtu: rgb("#c62828"),
  tt: rgb("#c25200"),
  ct: rgb("#946200"),
  be: rgb("#2e7d32"),
  eu: rgb("#1c4fb8"),
  te: rgb("#6a35b8"),
  at: rgb("#8e24aa"),
)

// Page geometry (A4, mirrored for binding).
#let page-margin = (
  top: 30mm,
  bottom: 28mm,
  inside: 30mm,
  outside: 36mm,
)
