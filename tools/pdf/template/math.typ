// Math for markup emitted by packages/ssg/src/typst/math.ts. STIX Two Math is pinned in
// tools/pdf/fonts.lock.json; CJK inside \text{} falls back to Noto Serif SC.
#let math-font = ("STIX Two Math", "STIX Two Text", "Noto Serif SC", "New Computer Modern Math")

// Imports cannot carry show rules, so the book applies this once: `#show: math-rules`.
#let math-rules(body) = {
  show math.equation: set text(font: math-font)
  body
}

// Centred display equation. `tag` is printed right-aligned as "(tag)".
#let eq(tag: none, body) = block(width: 100%, breakable: false)[
  #align(center, body)
  #if tag != none { place(right + horizon, [(#tag)]) }
]
