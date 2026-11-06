// The emitter's function vocabulary (see tools/pdf/README.md). Every visual
// decision about article content lives here; the emitter only chooses which
// function to call.
#import "theme.typ": *
#import "labels.typ": labels

#let locale-state = state("gtmc-locale", "en")
#let with-labels(f) = context f(labels.at(locale-state.get()))

// Mono, small, tracked: the book's "apparatus" voice (DESIGN.md). The only
// place uppercase and wide tracking are used.
#let apparatus(body, fill: ink-soft, size: size.apparatus, weight: 500) = text(
  font: fonts.mono,
  size: size,
  tracking: 0.1em,
  weight: weight,
  fill: fill,
  hyphenate: false,
  upper(body),
)

// ── Inline ────────────────────────────────────────────────────────────

#let icode(s) = highlight(
  fill: wash-strong,
  extent: 1.2pt,
  radius: 1.5pt,
  top-edge: "x-height",
  bottom-edge: "baseline",
  text(font: fonts.mono, size: 0.86em, hyphenate: false, s),
)

#let upd(kind, body) = text(fill: update-colors.at(kind), body)
#let ansi(name, body) = text(fill: tokens.ansi.at(name, default: ink), body)
#let person(name) = text(weight: 500, name)

#let bin(kind, body) = if kind == "1" {
  text(font: fonts.mono, weight: "bold", fill: signal, body)
} else if kind == "0" {
  text(font: fonts.mono, fill: ink-soft, body)
} else {
  text(font: fonts.mono, body)
}

// The site hides these until hover; on paper they are simply shown, marked.
#let spoiler(body) = highlight(fill: wash-strong, extent: 1.5pt, radius: 1.5pt, text(fill: ink-soft, body))

// ── Cross references ─────────────────────────────────────────────────

#let page-label(loc) = {
  let pattern = loc.page-numbering()
  numbering(if pattern == none { "1" } else { pattern }, ..counter(page).at(loc))
}

// Internal link with the page number appended when the target is elsewhere:
// a printed book cannot be clicked.
#let xref(id, body) = context {
  let targets = query(label(id))
  if targets.len() == 0 { return body }
  let loc = targets.first().location()
  let l = labels.at(locale-state.get())
  link(loc, body)
  if loc.page() != here().page() {
    text(size: 0.84em, fill: ink-soft, h(0.25em) + [(] + (l.page)(page-label(loc)) + [)])
  }
}

#let ext(url, body) = {
  let is-bare = body.has("text") and body.text == url
  let shown = underline(offset: 1.6pt, stroke: 0.5pt + ink-soft, link(url, body))
  shown
  // A reader of the printed page cannot click: carry the address in a footnote
  // unless the link text already is the address.
  if not is-bare {
    footnote(link(url, text(font: fonts.mono, size: 0.92em, hyphenate: false, url)))
  }
}

// ── Block furniture ──────────────────────────────────────────────────

#let sec(level, id, body) = {
  let h = heading(
    level: level + 1,
    numbering: none,
    outlined: false,
    bookmarked: level <= 3,
    body,
  )
  if id == none { h } else { [#h#label(id)] }
}

#let quote-block(body) = block(
  width: 100%,
  above: 1.1em,
  below: 1.1em,
  inset: (left: 12pt),
  stroke: (left: 0.8pt + hairline),
  text(fill: ink-soft, body),
)

#let thematic() = align(center, block(above: 2.2em, below: 2.2em, stack(
  dir: ltr,
  spacing: 8pt,
  align(horizon, line(length: 26pt, stroke: 0.5pt + hairline)),
  align(horizon, rotate(45deg, rect(width: 4pt, height: 4pt, stroke: 0.5pt + ink-soft))),
  align(horizon, line(length: 26pt, stroke: 0.5pt + hairline)),
)))

// A labelled block with a rule on its left. The label is a sticky block so it
// is never stranded at the foot of a page, away from its text.
#let ruled(rule, label, body, above: 1.2em, below: 1.2em) = {
  v(above, weak: true)
  block(sticky: true, width: 100%, below: 0pt, inset: (left: 12pt, bottom: 0.8em), stroke: (left: rule), label)
  block(width: 100%, above: 0pt, below: 0pt, inset: (left: 12pt, bottom: 1pt), stroke: (left: rule), body)
  v(below, weak: true)
}

#let callout(kind, body) = with-labels(l => {
  let c = callout-colors.at(kind, default: callout-colors.important)
  let title = l.callout.at(kind, default: l.callout.important)
  ruled(
    1.6pt + c.rule,
    apparatus(title, fill: c.label, weight: 600),
    if body == [] { l.callout-default.at(kind, default: []) } else { body },
  )
})

// `id` is accepted for the emitter's convenience but not attached: the
// section's own heading already carries that label.
#let advanced(id, body) = with-labels(l => {
  ruled(
    1.2pt + advanced-color,
    {
      apparatus(l.advanced, fill: advanced-color, weight: 600)
      h(0.9em)
      text(size: size.small, fill: ink-soft, l.advanced-note)
    },
    {
      body
      v(0.6em, weak: true)
      apparatus(l.advanced-end, fill: advanced-color)
    },
    above: 1.4em,
    below: 1.4em,
  )
})

#let tbl(align: (), header: (), rows: ()) = {
  let al = align.map(a => if a == "center" { center } else if a == "right" { right } else { left })
  let n = al.len()
  set par(justify: false, leading: 0.55em)
  set text(size: size.small + 0.2pt, hyphenate: false)
  block(width: 100%, above: 1.2em, below: 1.2em, breakable: true, std.align(center, table(
    columns: (auto,) * n,
    align: (col, _) => al.at(col),
    inset: (x: 7pt, y: 5pt),
    stroke: (_, y) => if y > 0 { (top: 0.35pt + hairline) } else { none },
    table.hline(stroke: 0.9pt + ink),
    table.header(
      ..header.map(c => strong(c)),
      table.hline(stroke: 0.5pt + ink),
    ),
    ..rows.flatten(),
    table.hline(stroke: 0.9pt + ink),
  )))
}

// Shiki tokens come as lines of (color, text[, style]) tuples.
#let codeblock(lang: "text", label: none, lines: ()) = {
  let num-w = 2.2em
  let cell(parts) = {
    for p in parts {
      let c = if p.at(0) == none { ink } else { rgb(p.at(0)) }
      let style = p.at(2, default: none)
      text(
        fill: c,
        style: if style == "italic" { "italic" } else { "normal" },
        weight: if style == "bold" { "bold" } else { "regular" },
        raw(p.at(1)),
      )
    }
  }
  block(
    width: 100%,
    above: 1.1em,
    below: 1.1em,
    breakable: true,
    fill: wash,
    stroke: (y: 0.5pt + hairline),
    inset: (x: 0pt, y: 7pt),
    {
      show raw: set text(font: fonts.mono, size: size.code)
      set par(leading: 0.5em, justify: false, linebreaks: "simple", spacing: 0pt)
      if label != none {
        pad(x: 9pt, bottom: 5pt, apparatus(label))
      }
      grid(
        columns: (num-w, 1fr),
        row-gutter: 0.42em,
        inset: (x: 9pt),
        ..lines.enumerate().map(((i, parts)) => (
          align(right, text(font: fonts.mono, size: size.code, fill: ink-soft.transparentize(45%), str(i + 1))),
          par(hanging-indent: 1.4em, cell(parts)),
        )).flatten(),
      )
    },
  )
}

// ── Figures ──────────────────────────────────────────────────────────

#let parse-width(width) = {
  if width == none { return none }
  if width.ends-with("%") { return float(width.slice(0, -1)) * 1% }
  if width.ends-with("px") { return float(width.slice(0, -2)) * 0.75pt }
  auto
}

#let img(path, alt: "", width: none) = {
  let w = parse-width(width)
  if w == none {
    box(baseline: 0.2em, image(path, alt: alt, height: 1.2em))
  } else {
    box(baseline: 0.2em, image(path, alt: alt, width: w))
  }
}

#let fig(path, alt: "", kind: "image", width: none, url: none) = with-labels(l => {
  let w = parse-width(width)
  block(width: 100%, above: 1.3em, below: 1.3em, breakable: false, align(center, {
    layout(avail => {
      let max-h = if kind == "diagram" { 205mm } else { 150mm }
      let probe = image(path, alt: alt, width: if w == none or w == auto { auto } else { w * avail.width })
      let m = measure(probe)
      let fit = if m.width > avail.width { image(path, alt: alt, width: avail.width) } else { probe }
      let fm = measure(fit)
      if fm.height > max-h { image(path, alt: alt, height: max-h) } else { fit }
    })
    if kind == "animated" {
      v(0.5em)
      apparatus(l.animated, size: size.apparatus)
      if url != none {
        h(0.6em)
        link(url, apparatus(l.view-original, fill: signal))
      }
    }
  }))
})

#let online(kind, url) = with-labels(l => block(
  width: 100%,
  above: 1.2em,
  below: 1.2em,
  inset: (x: 10pt, y: 8pt),
  stroke: 0.5pt + hairline,
  {
    apparatus(l.online.at(kind, default: l.online.iframe))
    v(0.35em)
    text(size: size.small, fill: ink-soft)[#l.online-hint #link(url, text(font: fonts.mono, size: 0.92em, hyphenate: false, url))]
  },
))

// Remote image that could not be fetched at build time. Shown loudly rather
// than dropped, so a dead link is visible in the printed book too.
#let fig-missing(alt: "", src: "") = with-labels(l => block(
  width: 100%,
  above: 1.3em,
  below: 1.3em,
  breakable: false,
  inset: (x: 12pt, y: 14pt),
  stroke: (paint: hairline, thickness: 0.6pt, dash: "dashed"),
  align(center, {
    apparatus(l.image-missing)
    if alt != "" and alt != "image" {
      v(0.4em)
      text(size: size.small, fill: ink-soft, alt)
    }
    v(0.4em)
    text(font: fonts.mono, size: 6.8pt, fill: ink-soft, hyphenate: false, src)
  }),
))

#let img-missing(alt: "", src: "") = with-labels(l => box(
  inset: (x: 3pt, y: 1pt),
  stroke: (paint: hairline, thickness: 0.5pt, dash: "dashed"),
  text(size: 0.8em, fill: ink-soft, if alt != "" { alt } else { l.image-missing }),
))
