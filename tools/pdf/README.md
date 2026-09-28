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
  → article transform (mermaid → SVG, GIF → WebP, image bytes)
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

**KaTeX splits its alphabet across twelve families**, four styles each, and the
math in these articles needs all of them — the stretchy delimiters and the
overline live in `KaTeX_Size1` … `KaTeX_Size4`. Faces are registered with
`subsetOf` so `font-family: KaTeX_Main` expands across that family's styles.

**GIF bytes are rejected; there is no decoder.** The 26 animated diagrams in
the articles are transcoded to WebP on first use and cached under `.cache/`,
which takes 18.9 MiB of GIF down to 0.3 MiB.

**KaTeX's MathML annotation must be stripped.** Each formula is emitted twice:
a visual HTML layer and a hidden `<span class="katex-mathml">`. The site hides
that layer with a 1px clip, but this renderer lays it out and shapes it, which
demands glyphs for operators the visual layer never draws. See
`src/assets/cleanup.ts`.

**Mermaid has no JavaScript runtime to run in.** Diagrams are rendered to SVG at
build time under `happy-dom`; see `src/assets/mermaid.ts` for the two settings
that make that work (`securityLevel: "loose"`, and a fresh container element
per render).
