// Book structure: page geometry, running heads, cover, contents, chapter
// openers, articles, colophon.
#import "theme.typ": *
#import "labels.typ": labels
#import "elements.typ": *
#import "math.typ": math-rules

#let meta-state = state("gtmc-meta", (:))

// Headings carry their role in `supplement` so show rules, running heads and
// the contents can tell chapters from articles without a second data source.
#let is-kind(h, kind) = repr(h.supplement) == repr([#kind])

#let heading-number(h) = if h.numbering == none { none } else { numbering(h.numbering, 1) }

// First heading of the wanted kind on the current page, else the last one
// before it.
#let current-heading(kinds) = {
  let pick(h) = kinds.any(k => is-kind(h, k))
  let here-page = here().page()
  let on-page = query(heading.where(outlined: true).after(here())).filter(pick)
  if on-page.len() > 0 and on-page.first().location().page() == here-page {
    return on-page.first()
  }
  let before = query(heading.where(outlined: true).before(here())).filter(pick)
  if before.len() > 0 { before.last() } else { none }
}

#let opens-chapter-here() = query(heading.where(level: 1)).any(h => h.location().page() == here().page())

// Pages that exist only to push the next chapter onto a recto carry no furniture.
#let is-blank-page() = {
  let p = here().page()
  if query(<bare-page>).any(m => m.location().page() == p) { return true }
  query(<recto-from>).zip(query(<recto-to>)).any(((a, b)) => a.location().page() < p and p < b.location().page())
}

#let running-head = context {
  if opens-chapter-here() or is-blank-page() { return none }
  let l = labels.at(locale-state.get())
  let recto = calc.odd(here().page())
  let chapter = current-heading(("chapter", "appendix"))
  let article = current-heading(("article",))
  let text-side = if recto { right } else { left }
  let content = if recto {
    if article != none { article.body } else { none }
  } else if chapter != none {
    let n = heading-number(chapter)
    let tag = if is-kind(chapter, "appendix") { (l.appendix)(n) } else { (l.chapter)(n) }
    [#text(fill: signal, tag)#h(1.2em)#chapter.body]
  } else if article != none {
    article.body
  } else { none }
  if content == none { return none }
  align(text-side, block(
    width: 100%,
    inset: (bottom: 5pt),
    stroke: (bottom: 0.4pt + hairline),
    apparatus(content, fill: ink-soft, size: 6.8pt),
  ))
}

#let folio = context {
  if is-blank-page() { return none }
  let recto = calc.odd(here().page())
  let pattern = here().page-numbering()
  let n = numbering(if pattern == none { "1" } else { pattern }, ..counter(page).get())
  align(if recto { right } else { left }, text(
    font: fonts.serif,
    size: 9pt,
    fill: ink-soft,
    features: ("onum",),
    n,
  ))
}

// ── Document shell ───────────────────────────────────────────────────

#let book(
  locale: "en",
  title: "",
  subtitle: none,
  tagline: none,
  date: "",
  revision: none,
  source-url: "https://www.techmc.wiki",
  article-count: 0,
  body,
) = {
  let l = labels.at(locale)
  let parts = date.split("-").map(int)
  set document(
    title: title,
    author: "techmc.wiki",
    date: if parts.len() == 3 { datetime(year: parts.at(0), month: parts.at(1), day: parts.at(2)) } else { auto },
  )
  set page(
    paper: "a4",
    margin: page-margin,
    fill: white,
    header-ascent: 40%,
    header: running-head,
    footer: folio,
    footer-descent: 30%,
  )
  set text(
    font: fonts.sans,
    size: size.body,
    fill: ink,
    lang: l.lang,
    region: l.region,
    hyphenate: true,
    weight: 400,
    number-type: "lining",
  )
  set par(
    justify: true,
    leading: if locale == "zh" { 0.95em } else { 0.72em },
    spacing: 0.95em,
    linebreaks: "optimized",
  )
  set list(indent: 0.4em, body-indent: 0.7em, spacing: 0.7em, marker: ([•], [–]))
  set enum(indent: 0.4em, body-indent: 0.7em, spacing: 0.7em)
  show: math-rules
  show strong: set text(weight: 600)
  show emph: set text(style: "italic")
  show link: it => it
  show footnote.entry: set text(size: size.small, fill: ink-soft)
  set footnote.entry(
    separator: line(length: 3.2cm, stroke: 0.4pt + hairline),
    gap: 0.55em,
    clearance: 1.2em,
    indent: 0em,
  )

  // Section hierarchy inside an article: levels 3 and up (hast h2..).
  show heading.where(level: 3): it => {
    set text(font: fonts.serif, size: size.section, weight: 600, fill: ink, hyphenate: false)
    set par(justify: false, leading: 0.5em)
    show regex("^\d+(\.\d+)*"): n => text(font: fonts.mono, size: 0.66em, weight: 500, fill: signal, n)
    block(above: 2.1em, below: 0.9em, sticky: true, it.body)
  }
  show heading.where(level: 4): it => {
    set text(font: fonts.serif, size: size.subsection, weight: 600, fill: ink, hyphenate: false)
    set par(justify: false, leading: 0.5em)
    show regex("^\d+(\.\d+)*"): n => text(font: fonts.mono, size: 0.7em, weight: 500, fill: signal, n)
    block(above: 1.7em, below: 0.7em, sticky: true, it.body)
  }
  show heading.where(level: 5): it => block(above: 1.4em, below: 0.6em, sticky: true, {
    set par(justify: false)
    text(font: fonts.sans, size: size.body, weight: 600, hyphenate: false, it.body)
  })
  show heading.where(level: 6): it => block(above: 1.2em, below: 0.5em, sticky: true, {
    set par(justify: false)
    text(font: fonts.sans, size: size.body, weight: 500, style: "italic", fill: ink-soft, hyphenate: false, it.body)
  })

  [#meta-state.update((
    title: title,
    subtitle: subtitle,
    tagline: tagline,
    date: date,
    revision: revision,
    source-url: source-url,
    article-count: article-count,
  ))#locale-state.update(locale)]
  body
}

// ── Cover ────────────────────────────────────────────────────────────

#let logo-mark = image(
  bytes("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><path d=\"M40.751 20H20V80H24.6738L21.9951 90H10V10H43.4307L40.751 20ZM43.6289 90H34.9355L37.6152 80H46.3076L43.6289 90ZM90 90H56.5693L59.249 80H80V20H75.3262L78.0049 10H90V90ZM62.3848 20H53.6924L56.3711 10H65.0645L62.3848 20Z\" fill=\"#20283c\"/><path d=\"M75.3262 20L59.249 80H46.3086L62.3848 20H75.3262ZM53.6914 20L37.6143 80H24.6748L40.751 20H53.6914Z\" fill=\"#1d6a96\"/></svg>"),
  format: "svg",
  alt: "",
)

// The site hero's dot grid, drawn dot by dot so it stays crisp at any scale.
// `hot` is (col, row, cols, rows): a block of larger signal-coloured dots.
#let dot-field(cols, rows, hot) = {
  let pitch = 5mm
  let quiet = ink-soft.transparentize(62%)
  for r in range(rows) {
    for c in range(cols) {
      let on = c >= hot.at(0) and c < hot.at(0) + hot.at(2) and r >= hot.at(1) and r < hot.at(1) + hot.at(3)
      let radius = if on { 0.6mm } else { 0.4mm }
      place(top + left, dx: c * pitch + pitch / 2 - radius, dy: r * pitch + pitch / 2 - radius, circle(radius: radius, fill: if on { signal } else { quiet }, stroke: none))
    }
  }
}

// Straight quotes in the site's slogan become typographic ones.
#let smart-quotes(s) = (
  s
    .replace(regex("(^|\\s)\""), m => m.captures.at(0) + "“")
    .replace("\"", "”")
    .replace(regex("(^|\\s)'"), m => m.captures.at(0) + "‘")
    .replace("'", "’")
)

#let cover() = page(margin: 0mm, header: none, footer: none, fill: white, context {
  let m = meta-state.get()
  let l = labels.at(locale-state.get())
  let side = 25mm
  // Dot grid motif from the site's hero, bleeding off three edges, with one
  // "selected block" in the signal colour.
  place(top + left, dy: 60mm, block(width: 210mm, height: 105mm, dot-field(42, 21, (26, 5, 8, 8))))
  place(top + left, dx: side, dy: 24mm, box(width: 17mm, logo-mark))
  place(top + right, dx: -side, dy: 29mm, apparatus("techmc.wiki", fill: ink, size: 8pt, weight: 600))
  place(top + left, dx: side, dy: 182mm, block(width: 210mm - 2 * side, {
    set par(justify: false, leading: 0.38em, spacing: 0pt)
    text(font: fonts.serif, size: 42pt, weight: 600, fill: ink, hyphenate: false, m.title)
    if m.subtitle != none {
      v(16pt)
      text(font: fonts.serif, size: 16pt, style: "italic", fill: ink-soft, hyphenate: false, m.subtitle)
    }
    v(18pt)
    line(length: 24mm, stroke: 1.8pt + signal)
    if m.tagline != none {
      v(12pt)
      apparatus(smart-quotes(m.tagline), size: 8pt)
    }
  }))
  place(bottom + left, dx: side, dy: -22mm, block(width: 210mm - 2 * side, stroke: (top: 0.5pt + hairline), inset: (top: 8pt), {
    apparatus(l.edition, fill: ink-soft, size: 7.4pt)
    h(1fr)
    apparatus(m.date, fill: ink-soft, size: 7.4pt)
  }))
})

// ── Front matter ─────────────────────────────────────────────────────

// Copyright page, then the rest of the front matter in roman numerals.
#let front-matter(body) = {
  set page(numbering: "i", header: none, footer: none)
  counter(page).update(1)
  context {
    let m = meta-state.get()
    let l = labels.at(locale-state.get())
    v(1fr)
    block(width: 80%, {
      set par(justify: false, leading: 0.6em, spacing: 0.9em)
      set text(size: size.small, fill: ink-soft)
      text(font: fonts.serif, size: 12pt, weight: 600, fill: ink, m.title)
      v(0.3em)
      apparatus(l.edition, size: 6.8pt)
      v(1.4em)
      l.imprint-community
      parbreak()
      l.imprint-license
      parbreak()
      [#l.colophon-source #link(m.source-url, text(font: fonts.mono, size: 0.92em, hyphenate: false, m.source-url.replace(regex("^https?://"), "")))]
    })
  }
  set page(header: running-head, footer: folio)
  body
}

// Arabic numbering restarts at the first chapter's recto. The marker pair is
// emitted around the switch so the blank verso it forces is recognised.
#let main-matter(body) = {
  [#metadata(none)<recto-from>]
  set page(numbering: "1")
  pagebreak(to: "odd", weak: true)
  [#metadata(none)<recto-to>]
  counter(page).update(1)
  body
}

// Pagebreak to the next recto without printing furniture on the blank verso.
#let to-recto() = {
  [#metadata(none)<recto-from>]
  pagebreak(to: "odd", weak: true)
  [#metadata(none)<recto-to>]
}

// Dot leader between a contents entry and its folio.
#let leader = box(width: 1fr, inset: (x: 0.5em), align(right, text(fill: hairline.darken(10%), repeat([.#h(0.28em)]))))

#let toc() = {
  to-recto()
  context {
    let l = labels.at(locale-state.get())
    block(below: 10mm, {
      set par(justify: false)
      text(font: fonts.serif, size: size.article, weight: 600, hyphenate: false, l.contents)
      v(7pt)
      line(length: 100%, stroke: 0.8pt + ink)
    })
    for h in query(heading.where(outlined: true).and(heading.where(level: 1).or(heading.where(level: 2)))) {
      let loc = h.location()
      let n = heading-number(h)
      let pg = page-label(loc)
      if is-kind(h, "chapter") or is-kind(h, "appendix") {
        let tag = if is-kind(h, "appendix") { (l.appendix)(n) } else { (l.chapter)(n) }
        block(above: 1.55em, below: 0.7em, sticky: true, breakable: false, link(loc, {
          box(width: 24mm, apparatus(tag, fill: signal, size: 6.6pt, weight: 600))
          text(font: fonts.serif, size: 11.5pt, weight: 600, hyphenate: false, h.body)
          leader
          text(font: fonts.serif, size: 9.5pt, features: ("onum",), pg)
        }))
      } else if is-kind(h, "folder") {
        block(above: 0.8em, below: 0.35em, sticky: true, pad(left: 24mm, text(size: 8.6pt, style: "italic", fill: ink-soft, h.body)))
      } else {
        block(above: 0.5em, below: 0em, breakable: false, link(loc, {
          box(width: 24mm, align(right, pad(right: 3mm, if n != none { text(font: fonts.mono, size: 6.8pt, fill: ink-soft, n) })))
          text(size: 9pt, hyphenate: false, h.body)
          leader
          text(font: fonts.serif, size: 9pt, fill: ink-soft, features: ("onum",), pg)
        }))
      }
    }
  }
}

// ── Chapters and articles ────────────────────────────────────────────

#let page-of(id) = context {
  let t = query(label(id))
  if t.len() > 0 { page-label(t.first().location()) }
}

#let chapter(number: "", title: "", appendix: false, articles: ()) = {
  to-recto()
  show heading.where(level: 1): it => context {
    let l = labels.at(locale-state.get())
    let n = heading-number(it)
    let tag = if appendix { (l.appendix)(n) } else { (l.chapter)(n) }
    v(32mm)
    block(width: 100%, {
      set par(justify: false)
      apparatus(tag, fill: signal, size: 8pt, weight: 600)
      v(4pt)
      text(font: fonts.serif, size: 84pt, weight: 400, fill: tokens.accent, hyphenate: false, n)
      v(8pt)
      line(length: 100%, stroke: 0.8pt + ink)
      v(14pt)
      text(font: fonts.serif, size: size.chapter, weight: 600, fill: ink, hyphenate: false, it.body)
    })
  }
  heading(
    level: 1,
    numbering: (..n) => number,
    supplement: if appendix { [appendix] } else { [chapter] },
    title,
  )
  if articles.len() > 0 {
    v(18mm)
    with-labels(l => {
      apparatus(l.in-chapter, size: 7pt)
      v(8pt)
      for a in articles {
        block(above: 0.5em, below: 0em, breakable: false, {
          set par(justify: false)
          box(width: 12mm, text(font: fonts.mono, size: 7.2pt, fill: signal, a.at("number", default: "")))
          text(size: 9.4pt, hyphenate: false, a.title)
          leader
          text(font: fonts.serif, size: 9pt, fill: ink-soft, features: ("onum",), page-of(a.slug))
        })
      }
    })
  }
  pagebreak(weak: true)
}

#let folder(title) = {
  show heading.where(level: 2): it => if is-kind(it, "folder") {
    block(above: 2.6em, below: 1.2em, sticky: true, width: 100%, {
      set par(justify: false)
      line(length: 100%, stroke: 0.4pt + hairline)
      v(8pt)
      apparatus(it.body, fill: ink, size: 8pt, weight: 600)
    })
  } else { it }
  heading(level: 2, numbering: none, supplement: [folder], bookmarked: true, title)
}

#let article(slug: "", number: none, title: "", advanced: false, preface: false, body) = {
  if preface { to-recto() }
  counter(footnote).update(0)
  show heading.where(level: 2): it => if is-kind(it, "article") {
    let n = heading-number(it)
    block(above: 3em, below: 1.5em, sticky: true, width: 100%, {
      set par(justify: false, leading: 0.4em)
      if n != none { text(font: fonts.mono, size: 8pt, weight: 500, fill: signal, tracking: 0.08em, n) }
      if advanced {
        if n != none { h(1.2em) }
        with-labels(l => apparatus(l.advanced, fill: advanced-color, size: 7pt, weight: 600))
      }
      if n != none or advanced { v(5pt) }
      text(font: fonts.serif, size: size.article, weight: 600, fill: ink, hyphenate: false, it.body)
      v(8pt)
      line(length: 100%, stroke: 0.6pt + ink)
    })
  } else { it }
  let h = heading(
    level: 2,
    numbering: if number == none { none } else { (..n) => number },
    supplement: [article],
    bookmarked: true,
    title,
  )
  [#h#label(slug)]
  body
}

// ── Colophon ─────────────────────────────────────────────────────────

#let colophon() = {
  to-recto()
  context {
    let m = meta-state.get()
    let l = labels.at(locale-state.get())
    [#metadata(none)<bare-page>]
    v(1fr)
    block(width: 80%, {
      set par(justify: false, leading: 0.6em, spacing: 0.9em)
      set text(size: size.small, fill: ink-soft)
      apparatus(l.colophon, fill: ink, size: 7.4pt, weight: 600)
      v(0.8em)
      [#m.title, #(l.colophon-articles)(m.article-count).]
      parbreak()
      [#l.colophon-generated #m.date.]
      if m.revision != none {
        parbreak()
        [#l.colophon-revision #text(font: fonts.mono, size: 0.92em, m.revision)]
      }
      parbreak()
      l.colophon-typeset
    })
  }
}
