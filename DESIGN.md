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
  Localize all reader labels: “Table of Contents,” “Search the Text,” and
  “On This Page.” The footer carries imprint, community, contribution, and
  source information rather than duplicating reading navigation.
- Preserve the reader's responsive chapter navigation and outline controls.
  Markdown uses `lib/markdown/components/`, not Tailwind `prose-*` classes.
- Article openings use plain sans paragraphs. At reading widths, justify
  top-level paragraphs with hyphenation; mobile, lists, quotes, and callouts
  remain ragged-right. Retain thematic-break and chapter-end devices.

## Interaction and accessibility

- Keep visible focus states from shared primitives: outlines for controls,
  border changes for inputs. Never remove focus without a visible replacement.
- Provide visible field labels, linked helper text, accessible icon-button
  names, and overlay titles/descriptions inside Dialog or Sheet content.
- Maintain 44px touch targets, keyboard access, readable contrast, and zoom.
  Essential affordances must remain visible without hover.
- Use `aria-busy` for pending work, disabled semantics for blocked actions,
  and appropriate live regions for status. Reuse loading-shell primitives
  and `OperationProgress` instead of inventing spinners or progress treatments.
- Prefer color transitions; reserve scale effects for hero/primary CTAs.
  Reuse CSS animation tokens, avoid layout shifts, and honor reduced motion.
  `motion/react` is unavailable; existing interactive effects use canvas or CSS.
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
