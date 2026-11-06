# GTMC PDF (Typst)

The book PDFs (`gtmc-en.pdf`, `gtmc-zh.pdf`) are produced by one `typst compile` per locale.
Articles go through the shared Markdown pipeline to **hast**, an emitter turns each article's
hast into Typst markup that only calls the template's function vocabulary, and the template in
`template/` owns every visual decision.

```text
articles ─▶ @gtmc/ssg Markdown pipeline ─▶ hast ─▶ hast→Typst emitter ─▶ work/<locale>/articles/*.typ ─┐
Mermaid ─▶ SVG (apps/web/lib/pdf/mermaid.ts)                                                           ├▶ typst compile ─▶ dist/gtmc-<locale>.pdf
images  ─▶ work/<locale>/assets (apps/web/lib/pdf/images.ts)                                           │
CSS tokens ─▶ work/tokens.typ (apps/web/lib/pdf/tokens.ts)    book.typ (apps/web/scripts/generate-pdf.ts)┘
```

## Layout

```text
tools/pdf/
  template/      Typst library. Owned by design. gtmc.typ exports only the vocabulary below.
  fonts.lock.json  Pinned font files (url + sha256); the single source for fonts/
  fonts/         Static OTF/TTF files downloaded from the lock file (gitignored)
  work/          Generated Typst inputs, assets, tokens.typ (gitignored)
  dist/          Output PDFs and cover PNGs (gitignored)
```

Typst is always run with `--root tools/pdf --font-path tools/pdf/fonts --ignore-system-fonts`, so
every generated file imports the template as `#import "/template/gtmc.typ": *` and references
assets by root-relative path (`/work/en/assets/ab12cd.png`).

Fonts (family names exactly as Typst sees them): `Geist`, `Geist Mono`, `STIX Two Text`,
`Noto Sans SC`, `Noto Serif SC`.

## Emitter output vocabulary

The emitter may emit **only** the following (plus escaped plain text and Typst built-ins listed
here). Anything else in the hast is an error: throw `TypstEmitError` naming the article, the
element, and its classes. Silent drops are a bug. All arguments are Typst syntax; strings are
Typst string literals (escape `\` and `"`), bodies are content blocks `[...]`.

### Built-ins used directly

`#strong[..]` `#emph[..]` `#strike[..]` `#super[..]` `#sub[..]` `#linebreak()`
`#list(tight: bool, [item], [item])` `#enum(start: n, tight: bool, [item], [item])`
`#footnote[..]` (footnote definitions are moved inline to their reference site)
`#align(center)[..]`. Paragraph breaks are blank lines.

### Template functions

| Function | Meaning |
| --- | --- |
| `#sec(level, id)[title]` | Heading from hast `h2`..`h6` (`level` 2..6). `id` is the FULL book-wide id `"<article-slug>#<anchor>"` (same string `#xref` uses) or `none`. Heading numbers are already part of the title text; do not renumber. |
| `#icode("text")` | Inline code. |
| `#codeblock(lang: "java", label: "Java / MC 1.20.1 / Yarn" \| none, lines: (<line>, ...))` | Code block. Each `<line>` is an array of `(color, text)` or `(color, text, style)` tuples: `color` is `"#rrggbb"` or `none`, `style` is `"italic"`, `"bold"` or omitted. Preserve all whitespace inside `text`. `label` is the full header label exactly as the site shows it. Use Shiki's light-theme colours. |
| `#tbl(align: ("left", "center", ...), header: ([cell], ...), rows: (([cell], ...), ...))` | Table. A cell may be `table.cell(colspan: n)[..]`. |
| `#callout(kind, [body])` | `kind` is the lowercase marker: `"warning"`, `"tip"`, `"important"`, `"crash"`, `"corruption"`. |
| `#quote-block[..]` | Plain blockquote. |
| `#advanced(id)[..]` | Advanced (graduate-level) section; `id` is `"<article-slug>#<data-advanced-heading>"`. The section's own heading is emitted inside as `#sec`. |
| `#thematic()` | `hr`. |
| `#fig(path, alt: "..", kind: "image" \| "diagram" \| "animated", width: none \| "50%", url: none \| "https://..")` | Block figure. `animated` is for GIFs (`url` is the original on the website). |
| `#img(path, alt: "..", width: none \| "50%")` | Inline image. |
| `#fig-missing(alt: "..", src: "..")` / `#img-missing(alt: "..", src: "..")` | Block / inline placeholder for a remote image that could not be downloaded at build time (local images that fail are build errors). |
| `#xref(id)[body]` | Link to another place in the book. `id` is `"<article-slug>"` for an article or `"<article-slug>#<anchor>"` for a heading. The template silently renders just the body when the target does not exist. |
| `#ext("https://..")[body]` | External link. |
| `#upd("wtu" \| "tt" \| "ct" \| "be" \| "eu" \| "te" \| "at")[..]` | Update-type colouring from `<wtucolor>`, `<ttcolor>`, `<ctcolor>`, `<becolor>`, `<eucolor>`, `<tecolor>`, `<atcolor>`. |
| `#ansi("red" \| "bright-blue" \| ...)[..]` | The site's ANSI colour tags. Names exactly as the site's `ANSI_COLOR_NAMES`. |
| `#bin("0" \| "1" \| "")[..]` | Spans with class `binary-0`, `binary-1`, `binary`. |
| `#person("Display name")` | `people-mention`. |
| `#spoiler[..]` | `<hidden>`. |
| `#online(kind, url)` | Content that only works online: `kind` is `"litematica"` or `"iframe"`. |

`nc` and `pp` pseudo-tags render their children unchanged. Wikilinks render as plain text.

### Written by the pipeline driver, not the emitter

```typst
#import "/template/gtmc.typ": *
#show: book.with(locale: "en", title: "..", subtitle: "..", tagline: "..", date: "2026-11-05",
  revision: "9d5ae63" | none, source-url: "https://www.techmc.wiki", article-count: 40)
#cover()
#show: front-matter      // imprint page, roman folios for everything until main-matter
#toc()
#include "articles/<preface-slug>.typ"   // preface articles come first (each calls #article(.., preface: true))
#show: main-matter       // arabic folios restart at the first chapter's recto
#chapter(number: "1", title: "Block Update", appendix: false,
  articles: ((number: "1.1", title: "..", slug: "..."), ...))   // articles of the chapter, folders excluded
#folder("Title")        // sub-folder divider inside a chapter
#include "articles/<slug>.typ"   // each file: #article(slug: "..", number: "1.1" | none, title: "..", advanced: false, preface: false)[ ...emitted body... ]
#colophon()
```

`#show: front-matter` and `#show: main-matter` are show rules (they take the rest of the document as
their body); they must appear exactly once each, at top level of `book.typ`, in that order.
`number: none` is used for unnumbered articles (prefaces, intro readmes) in both `#article` and
the chapter's `articles:` list entries (`number` key may be absent or `none`).

`#article(slug:, number:, title:, advanced:, preface: false)[body]` wraps every article, including
prefaces (`preface: true`).

## Tokens

`apps/web/lib/pdf/tokens.ts` reads the light theme colour tokens from `apps/web/app/globals.css`
and writes `tools/pdf/work/tokens.typ` defining `#let tokens = (bg: rgb(..), main: .., main-dark: ..,
line: .., signal: .., signal-ink: .., advanced: .., surface: .., accent: ..)`. The template imports
it from `/work/tokens.typ`. The PDF page itself is white; `bg`/`surface` are only used for subtle fills.

## Hard rules

- No third copy of site constants: colours come from `tokens`, labels from `template/labels.typ`.
- Fail closed: unknown hast, unknown classes and undecodable images are build errors. Images that
  do not exist (dead remote host, file missing from the content repo) print as a visible
  placeholder and are reported in the build log.
- Generated output (`work/`, `dist/`, `fonts/`) is never committed.

## Running locally

```bash
brew install typst          # 0.15.x; CI pins the exact version
pnpm build:pdf              # both locales -> tools/pdf/dist/gtmc-{en,zh}.pdf and *.cover.png
pnpm build:pdf --locale en  # one locale
```

Mermaid diagrams are pre-rendered through a headless Chrome (`PDF_CHROMIUM`, or a Chrome/Chromium
found on the machine). Fonts download on the first run.
