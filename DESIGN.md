# GTMC Design

Reader surfaces evoke an academic book; app surfaces stay quiet and functional. When code differs, consult `app/globals.css` and shared components.

## Shared Styling

- **Primitives**: Prefer `components/ui/shadcn/` primitives and keep the theme layer thin: tokens own colors and geometry, components own typography/focus/disabled states, call sites add only layout and state. Use `Card` for panels, editor components for drafts, and article shell for reading.
- **Geometry**: Flat, square geometry by default. Small radii are reserved for dense indicators/skeletons; circles for dots/avatars.
- **Refactoring**: When removing styles, preserve layout, focus, selection, and touch sizing; remove only redundant decoration.
- **Marks & Affordances**: Show, don't tell. State or category is carried consistently across surfaces by marks (Lucide icons, rules, tints) rather than text tags.
- **Semantic Components**: Use component primitives instead of raw characters or Unicode: Lucide icons for affordances (never emojis), `Separator` for inline rules, `Badge` for counts (`Badge` beside label, never `Label (12)`), and `Kbd` for shortcuts. Decorative icons require `aria-hidden`; icon-only buttons require `aria-label`.
- **Clarity**: Strip a control to an icon only when unambiguous alone; differentiate overlapping icons. Render empty values as nothing, never placeholder dashes.
- **Density & Copy**: Every element must earn its space. Describe content scope objectively ("goes deeper into underlying mechanics") rather than instructing the reader ("safe to skip").

## Text and Separators

- Separate metadata with borders, `Separator`, or spacing—never middle dots, `|`, or slashes.
- Translation strings contain no layout glyphs (arrows, joiners); keep only owned prose typography (`©`, `…`, `–`, `%`, `°`, `@`).

## Color and Typography

- **Semantic Tokens**: Use tokens from `app/globals.css`, never raw colors or `bg-white`: `tech-bg` (page), `surface*` variants, `tech-main` (body), `tech-main-dark` (emphasis), `tech-accent` (selection), and `tech-line` (borders only).
- **Themes**: Light mode is warm paper and dark ink; dark mode is cool blue-slate with cyan signal. Scope via `[data-theme="dark"]` (`dark:` in Tailwind); icons use `currentColor`.
- **Signal**: Use `tech-signal` sparingly for active states, focus rings, and brand accents. Pair signal fills with `tech-signal-ink`. Avoid large signal fills outside the hero; never use signal-colored body text on light backgrounds.
- **Advanced Material**: `tech-advanced` marks graduate-level content. It is a muted plum, kept distinct from error/warning ambers and reds.
- **Contrast & Accessibility**: Text contrast must meet ≥ 6:1 (light) and ≥ 4.5:1 (dark) across all surfaces and remain distinguishable under protanopia, deuteranopia, and tritanopia.
- **Canonical Type Styles**: Standardize on six styles; never introduce ad-hoc sizes or sub-12px (`< text-xs`) micro-typography:
  1. **Display Serif** (`display-title text-3xl md:text-5xl font-semibold`): page headers, article H1, error codes.
  2. **Section Serif** (`display-title text-xl md:text-2xl font-semibold`): section titles, article H2/H3, logo wordmark.
  3. **UI Title** (`font-sans text-base leading-none font-semibold`): `DialogTitle`, `CardTitle`, `SheetTitle`.
  4. **Body Prose** (`font-sans text-base leading-relaxed`): article reading prose, `EmptyState`, form inputs (`Input`, `Textarea`).
  5. **UI Text** (`font-sans text-sm`): controls (`Button`, `TabsTrigger`, `Label`) and descriptions (`CardDescription`, dialogs, dropdowns). Scale controls via padding/touch-target, not font size.
  6. **Apparatus** (`font-mono text-xs`): `Badge`, `Kbd`, `Toaster`, `mono-label`, chapter prefixes, progress readouts. Uppercase and wide tracking are strictly reserved for apparatus.

## Layout and Reading

- **Layout**: Mobile-first with `page-container`, shared headings, and standard gutters. Use column grids only for sidebars or rails.
- **Navigation**: Homepage table of contents is primary navigation (bookmarks, chapter context, glossary). Reader routes are public; drafts require authentication. Localize reader labels in `messages/`.
- **Article Reader**: Markdown renders via `components/markdown/`, not Tailwind `prose-*`. Body copy is ragged-right (`.article-prose` sets `text-wrap: pretty`); hyphenation is reserved for Typst PDF only. Retain thematic-break and chapter-end devices.

## Interaction and Motion

- **Focus & Touch**: Keep visible primitive focus outlines and input border transitions. Maintain 44px touch targets on mobile, tightened with `sm:min-h-0` on pointer devices.
- **Controls**: Prefer `Button variant="ghost"` over `variant="link"`. Use `IconButton` for recognizable utility actions; keep explicit text for primary CTAs and content choices.
- **Composite Headers**: Identity on the left (language, version, path, level), controls on the right, balanced on one line.
- **Feedback & Loading**: Use `aria-busy`, disabled semantics, and live regions. Reuse loading shells and `OperationProgress` instead of ad-hoc spinners.
- **Motion**: Use `app/transitions.css` recipes (disclosures, indicators, swaps), `app/overlay-transitions.css` (Radix exit lifecycles), and `app/homepage-transitions.css` (hero tilt). Do not add motion libraries; honor `prefers-reduced-motion`.
- **Decoration**: Subordinate and quiet (dot grids, rules, interactive brackets). No fake HUDs, watermarks, static corner brackets, or noninteractive hover gimmicks.

## Sources

- Theme, fonts, utilities: `app/globals.css`, `app/[locale]/layout.tsx`
- Primitives & components: `components/ui/` (especially `ui/shadcn/`)
- Navigation & footer: `components/layout/`
- Reader: `components/articles/`, `app/[locale]/(public)/articles/`, `components/markdown/`
- Homepage & Editor: `app/[locale]/_homepage/`, `components/editor/`
