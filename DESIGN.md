# GTMC Design

Reader surfaces evoke an academic book; app surfaces stay quiet and functional.
This guide describes the visual system. When implementation details differ,
consult `app/globals.css` and the shared components.

## Shared styling

- Prefer `components/ui/shadcn/` primitives, and keep the theme layer thin:
  tokens own colors and geometry, components own typography, focus, and disabled
  states, and call sites add only layout and meaningful state. Use `Card` for
  general panels, existing editor components for drafts, and the article shell
  for reading; static panels need no hover effect.
- Default to flat, square geometry. Small radii are acceptable for dense
  indicators and skeletons; circles are for dots and avatars.
- Before removing styles, compare the surface with the layer disabled. Preserve
  layout, focus, selection, and touch sizing; remove only redundant decoration.
- Show, don't tell. A level, state, or category is carried by a mark (a lucide
  icon, a rule, a tint) rather than a text tag, and the same icon carries it on
  every surface (outline, contents, chapter tree, imprint) so the reader learns
  it once.
- Marks come from the component system, never from characters. An icon (never a
  Unicode character or emoji) carries an affordance; `Separator` carries an
  inline separator; `Badge` carries a count beside a label, never `Label (12)`;
  `Kbd` carries a keyboard shortcut. Decorative icons are `aria-hidden`, and a
  control whose content is one icon keeps its name through `aria-label`.
- Strip a control to an icon only when that icon is unambiguous alone. If two
  controls would then share one mark, differentiate them instead of leaving both
  bare.
- An empty value renders nothing, never a placeholder dash.
- Every element on a line must earn its space. Do not spend a whole row on a
  label, and do not repeat in chrome what the content already says.
- Keep the word count honest: label a block and state its scope, describing what
  it contains ("goes deeper into the underlying mechanics") rather than
  instructing the reader ("safe to skip on a first read").

## Text and separators

- Separate run-together metadata with a border, a `Separator`, or spacing, never
  a middle dot, `|`, or slash. Finish the thought in one clear line.
- Translation strings carry no layout glyphs (arrows, joiners); the call site
  renders the mark. The string keeps only the typography it owns: `©`, `…` in
  prose, `–` in year ranges, `%`, `°`, `@`.

## Color and type

- Use semantic tokens from `app/globals.css`, never raw colors or `bg-white`.
  `tech-bg` is the page; `surface`, `surface-overlay`, `surface-input`, and
  `surface-modal` distinguish surfaces. Use `tech-main` for body text,
  `tech-main-dark` for emphasis, `tech-accent` for muted selection, and
  `tech-line` for borders only.
- Light mode is warm paper and dark ink; dark mode is cool blue-slate with a
  cyan signal. Theme state comes from `[data-theme="dark"]`; use `dark:`, not
  application-level `prefers-color-scheme` queries. Icons use `currentColor`.
- Use `tech-signal` sparingly for active states, focus, and brand accents. Avoid
  large signal fills outside the hero, and no signal-colored body text on light
  backgrounds. Pair signal fills with `tech-signal-ink`.
- `tech-advanced` marks graduate-level material. It is a muted plum, kept clear
  of the reds, oranges, and ambers that already carry error meaning (crash,
  corruption, revision warnings), so a deep dive never reads as a warning.
- Verify a new or changed token before shipping it: measure contrast against
  every surface it sits on in both themes (≥ 6:1 light, ≥ 4.5:1 dark for text),
  keep chroma inside the band the rest of the palette occupies, and check the
  hue distance from the tokens it will appear next to, including under
  protanopia, deuteranopia, and tritanopia.
- Page, section, and article headings use the serif `display-title` style in
  sentence case. Body text uses sans.
- Standard controls, labels, dialog titles, and empty states use normal-case
  sans. Mono is opt-in for code, data, identifiers, shortcuts, and occasional
  navigation apparatus; uppercase and wide tracking stay within that apparatus.

## Layout and reading

- Work mobile-first. Reuse `page-container`, shared headings, and existing
  gutters. Use column grids only where sidebars or rails require them.
- The homepage table of contents is primary navigation: bookmarks resume
  reading, chapter context orients readers, and glossary links connect terms.
- Anonymous navigation exposes reader routes; drafts appear after login. Reader
  labels are localized through `messages/`; never inline English. The footer
  carries imprint, community, contribution, and source information rather than
  duplicating reading navigation.
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
  the left (language, version, path, level) and controls on the right, with the
  row balanced across the full width and kept to one line.
- Use `IconButton` for utility actions with recognizable icons and localized
  hover/focus labels. Keep explicit text for primary CTAs, confirmations, and
  content choices (chapters, files, languages, filters); never hide their
  meaning.
- Provide visible field labels, linked helper text, accessible icon-button
  names, and overlay titles/descriptions inside Dialog or Sheet content.
- Essential affordances stay visible without hover, hold readable contrast, and
  survive zoom.
- Use `aria-busy` for pending work, disabled semantics for blocked actions, and
  appropriate live regions for status. Reuse loading-shell primitives and
  `OperationProgress` instead of inventing spinners or progress treatments.
- Use the transitions.dev recipes in `app/transitions.css` for disclosures,
  selection indicators, icon swaps, and loading reveals; keep overlay motion in
  `app/overlay-transitions.css`, whose CSS animations preserve Radix exit
  lifecycles, and hero tilt in `app/homepage-transitions.css`. Keep recipe CSS
  and site-specific geometry overrides separate.
- Honor reduced motion, avoid layout shifts, and show primary actions without
  entrance delays. Prefer color transitions for hover feedback; do not add a
  motion library.
- Keep decoration subordinate: dot grids, quiet rules, and interactive
  article-navigation brackets. No fake HUD readouts, watermarks, dimension
  marks, static corner brackets, heavy shadows, or ornamental noninteractive
  hover effects. Live indicators must represent changing state, and purely
  decorative elements stay marked and never intercept input.

## Sources

- Theme, fonts, utilities, motion: `app/globals.css`, `app/[locale]/layout.tsx`.
- Primitives and shared patterns: `components/ui/`, especially `ui/shadcn/`.
- Navigation and footer: `components/layout/`.
- Reader: `components/articles/`, `app/[locale]/(public)/articles/`,
  `lib/markdown/components/`.
- Homepage: `app/[locale]/_homepage/`. Draft workspace: `components/editor/`.
