# GTMC Design

Reader surfaces evoke an academic book; app surfaces stay quiet and functional.
This guide describes the visual system. When implementation details differ,
consult `app/globals.css` and the shared components.

## Shared styling

- Prefer `components/ui/shadcn/` primitives. Keep the theme layer thin: tokens
  own colors and geometry; components own typography, focus, and disabled states;
  call sites add layout and meaningful state without repeating primitive styles.
- Use `Card` for general panels, existing editor components for drafts, and the
  article shell for reading. Static panels need no hover effect.
- Default to flat, square geometry. Small radii are acceptable for dense
  indicators and skeletons; circles are for dots and avatars.
- Before removing styles, compare the surface with the layer disabled. Preserve
  layout, focus, selection, and touch sizing; remove redundant decoration.
- Show, don't tell. A level, state, or category is carried by a mark — a glyph,
  a rule, a tint — not by a text tag. Where a mark repeats across surfaces
  (outline, contents, chapter tree, imprint), the same glyph carries it
  everywhere so the reader learns it once.
- Minimalism means less chrome, not less information. Strip a control down to a
  glyph only when the glyph is unambiguous on its own; if two controls would
  then share one mark, differentiate them rather than leaving both bare.
- Every element on a line must earn the space. Do not spend a whole row on a
  label, and do not repeat in chrome what the content already says.
- Keep the word count honest. Label a block and state its scope; never
  prescribe how someone should read ("safe to skip on a first read" is a
  directive, "goes deeper into the underlying mechanics" is a description).
- Never use ` · ` as a separator in interface text. Finish the thought in one
  clear line.

## Color and type

- Use semantic tokens from `app/globals.css`, never raw colors or `bg-white`.
  `tech-bg` is the page; `surface`, `surface-overlay`, `surface-input`, and
  `surface-modal` distinguish surfaces. Use `tech-main` for body text,
  `tech-main-dark` for emphasis, `tech-accent` for muted selection, and
  `tech-line` for borders only.
- Light mode is warm paper and dark ink; dark mode is cool blue-slate with a
  cyan signal. Theme state comes from `[data-theme="dark"]`; use `dark:`,
  not application-level `prefers-color-scheme` queries. Icons use `currentColor`.
- Use `tech-signal` sparingly for active states, focus, and brand accents.
  Avoid large signal fills outside the hero and signal-colored body text on
  light backgrounds. Pair signal fills with `tech-signal-ink`.
- `tech-advanced` marks graduate-level material. It is a muted plum, kept clear
  of the reds, oranges, and ambers that already carry error meaning (crash,
  corruption, revision warnings) so a deep dive never reads as a warning.
- Verify a new or changed token before shipping it: measure contrast against
  every surface it sits on in both themes (≥ 6:1 light, ≥ 4.5:1 dark for text),
  keep chroma inside the band the rest of the palette occupies, and check the
  hue distance from the tokens it will appear next to — including under
  protanopia, deuteranopia, and tritanopia.
- Page, section, and article headings use the serif `display-title` or
  `markdown-title` styles in sentence case. Body text uses sans.
- Standard controls, labels, dialog titles, and empty states use normal-case
  sans. Mono is opt-in for code, data, identifiers, shortcuts, and occasional
  navigation apparatus; uppercase and wide tracking stay within that apparatus.

## Layout and reading

- Work mobile-first. Reuse `page-container`, shared headings, and existing
  gutters. Use column grids only where sidebars or rails require them.
- The homepage table of contents is primary navigation; bookmarks resume
  reading, chapter context orients readers, and glossary links connect terms.
- Anonymous navigation exposes reader routes; drafts appear after login.
  Reader labels are localized through `messages/`; never inline English. The
  footer carries imprint, community, contribution, and source information
  rather than duplicating reading navigation.
- Preserve the reader's responsive chapter navigation and outline controls.
  Markdown uses `lib/markdown/components/`, not Tailwind `prose-*` classes.
- Article body copy is ragged-right: `.article-prose` sets `text-wrap: pretty`
  rather than justification, and hyphenation belongs to the PDF renderer alone.
  Retain thematic-break and chapter-end devices.

## Interaction and accessibility

- Keep visible focus states from shared primitives: outlines for controls,
  border changes for inputs. Never remove focus without a visible replacement.
- Reach for `ghost` before `link`. `Button variant="link"` keeps the base
  button's border while dropping its hover surface, so it reads as unstyled;
  `ghost` with a size gives a hover state and focus ring that match the rest of
  the controls.
- Keep 44px touch targets on mobile, then tighten with `sm:min-h-0` (or a size
  utility) once a pointer is likely, so dense surfaces stay compact.
- Composite headers (code blocks, imprint strips, section bars) put identity on
  the left — language, version, path, level — and controls on the right, with
  the row balanced across the full width. Separate run-together metadata with a
  border or spacing, not a `|` or ` · ` character, and keep the row to one line.
- Use `IconButton` for utility actions with recognizable icons and localized
  hover/focus labels. Keep explicit text for primary CTAs, confirmations, and
  content choices (chapters, files, languages, filters); never hide their meaning.
- Provide visible field labels, linked helper text, accessible icon-button
  names, and overlay titles/descriptions inside Dialog or Sheet content.
- Essential affordances stay visible without hover, hold readable contrast,
  and survive zoom.
- Use `aria-busy` for pending work, disabled semantics for blocked actions,
  and appropriate live regions for status. Reuse loading-shell primitives
  and `OperationProgress` instead of inventing spinners or progress treatments.
- Use the transitions.dev recipes in `app/transitions.css` for disclosures,
  selection indicators, icon swaps, and loading reveals. Keep overlay motion
  in `app/overlay-transitions.css`; its CSS animations preserve Radix exit
  lifecycles. Hero tilt lives in `app/homepage-transitions.css`.
- Keep recipe CSS and site-specific geometry overrides separate. Honor reduced
  motion, avoid layout shifts, and show primary actions without entrance delays.
  Prefer color transitions for hover feedback; do not add a motion library.
- Keep decoration subordinate: dot grids, quiet rules, and interactive
  article-navigation brackets. No fake HUD readouts, watermarks, dimension
  marks, static corner brackets, heavy shadows, or ornamental noninteractive
  hover effects. Live indicators must represent changing state. Mark purely
  decorative elements appropriately and keep them from intercepting input.

## Sources

- Theme, fonts, utilities, motion: `app/globals.css`, `app/[locale]/layout.tsx`.
- Primitives and shared patterns: `components/ui/`, especially `ui/shadcn/`.
- Navigation and footer: `components/layout/`.
- Reader: `components/articles/`, `app/[locale]/(public)/articles/`,
  `lib/markdown/components/`.
- Homepage: `app/[locale]/_homepage/`. Draft workspace: `components/editor/`.
