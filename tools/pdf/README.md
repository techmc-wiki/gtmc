# PDF renderer

Renders the Graduate Texts in Minecraft as a downloadable book, one PDF per
locale. The output is published to R2 by `.github/workflows/pdf.yml` whenever
the articles submodule dispatches an update.

## Design

The renderer is a **standalone sidecar**: it is deliberately absent from the
pnpm workspace and installs from its own lockfile, so site installs, site
typechecks, and Vercel deploys never pull in its dependencies. It reads the
site only through generated artifacts under `apps/web/data/` — the article
manifest and the per-article HTML sidecars that `pnpm build:content` produces.
It never imports site code.

Rendering runs on [Takumi](https://takumi.kane.tw/docs/pdf), a WebAssembly
layout engine, through [pdfcn](https://pdfcn.dev) components. There is no
browser process and no headless Chromium in this pipeline.

```text
manifest.json + pdf-html sidecars
  → plan (preface, chapters, articles)
  → article transform (formulas → SVG, mermaid → SVG, GIF → WebP, image bytes)
  → shell: pdfcn components for cover, contents, openers, colophon
  → single node tree, one pagination pass
  → PDF with outline, internal links, and running furniture
```

## Commands

```bash
pnpm install                    # once; own lockfile
pnpm run build:pdf              # both editions → apps/web/data/pdf-dist/
pnpm run build:pdf -- --locale en
pnpm exec tsx src/cli.tsx pages <file.pdf>   # page count, for CI
pnpm typecheck
```

## Renderer constraints worth knowing

These are properties of the Takumi renderer, not choices made here. Each one
has a concrete consequence for this pipeline.

**There is no per-glyph fallback across font families.** A browser picks a
second webfont for a character the first lacks; this renderer resolves an
uncovered codepoint only against the `fontFamilies` chain, and fails the render
naming the character otherwise. Every script the book sets must appear in that
chain, in order — see `src/fonts.ts`.

**`uncoveredText` defaults to `"error"`, and that is deliberate here.** A silent
blank or a placeholder glyph would ship a book with holes in it. The build
should fail loudly instead.

**Declared coverage can overstate what a font carries.** The Noto SC subsets
advertise U+207B SUPERSCRIPT MINUS in their `unicode-range` but the subset
bytes do not contain the glyph, so a range check is not sufficient. Plain
`Noto Serif` is registered as a last-resort family to close gaps like this.

**GIF bytes are rejected; there is no decoder.** The 26 animated diagrams in
the articles are transcoded to WebP on first use and cached under `.cache/`,
which takes 18.9 MiB of GIF down to 0.3 MiB.

**The page is white and the text is black.** The book is printed as often as it
is read, and a tint prints as its ink. The palette in `src/theme.ts` is a ramp
of four grays and nothing else, so hierarchy is carried by weight and by the
rules that frame a block rather than by hue.

**Formulas do not survive KaTeX's markup; they are re-typeset.** The sidecar
carries each formula as KaTeX's nested tables, absolutely positioned vlists and
inline SVG — machinery written for a browser's inline layout. This renderer
lays it out one token per line. So `src/assets/math.ts` reads the TeX back out
of the MathML annotation, re-typesets it with MathJax, and hands the renderer
one self-contained SVG per formula. That also ends the dependency on the KaTeX
webfonts: the glyphs are outlines in the drawing, so nothing is subsetted or
embedded, and a formula carries no text for the reader to search.

Two things in the MathJax output need rewriting for this renderer. A nested
`<svg>` viewport — which is how a stretchy delimiter and an equation number
are placed — is laid out as though it were the whole drawing, so the equation
number is taken off the source and drawn as a second image beside the formula
instead. And a formula is a drawing on a transparent ground, so it takes none of
the frame every other image gets.

**Mermaid has no JavaScript runtime to run in.** Diagrams are rendered to SVG at
build time under `happy-dom`; see `src/assets/mermaid.ts` for the two settings
that make that work (`securityLevel: "loose"`, and a fresh container element
per render).
