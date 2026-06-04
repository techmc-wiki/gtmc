# GTMC Website Design System

This document records the visual system actually in use on the GTMC website. It is descriptive, not prescriptive: when reality and this doc disagree, the code wins. Source-of-truth examples live in `app/globals.css`, `components/ui/*`, `components/layout/*`, and the homepage and article-reader compositions.

## Design Direction

The site uses a **technical blueprint / scientific drafting** aesthetic.

- Flat, near-square surfaces with thin blue-gray borders.
- Monospace labels, status readouts, and bracketed metadata.
- Corner brackets, ticks, guide lines, dot grids, and scan/sweep overlays.
- Soft translucency through white overlays and `backdrop-blur-*`, not heavy shadows.
- Motion that reads like instrumentation: fade, clip-path slide, pop-in, blueprint sweep, scan confirm.

Avoid generic SaaS gradients, pill cards, emoji-as-icons, heavy drop shadows, and ad-hoc hex colors when a `tech-*` token will do.

## Source Files

Tokens and global styles
- `app/globals.css` — theme (`@theme`), animations, body backdrop, utility classes.
- `app/[locale]/layout.tsx` — root locale shell, font injection, footer wrapper.

Layout and navigation
- `components/layout/site-shell.tsx`, `desktop-nav.tsx`, `mobile-nav.tsx`, `auth-aware-nav.tsx`, `auth-island.tsx`, `language-switcher.tsx`, `footer.tsx`, `footer-wrapper.tsx`, `footer-context.tsx`.

Core primitives
- `components/ui/tech-card.tsx`, `tech-button.tsx`, `input-box.tsx`, `textarea-box.tsx`, `corner-brackets.tsx`, `selectable-card.tsx`, `segmented-control.tsx`.

Headings, status, metadata
- `components/ui/page-header.tsx`, `section-title.tsx`, `status-badge.tsx`, `status-dot.tsx`, `tag-list.tsx`, `metadata-row.tsx`, `empty-state.tsx`, `loading-indicator.tsx`.

Loading and progress
- `components/ui/loading-shell-primitives.tsx`, `operation-progress.tsx`.

Editor and review subsystems
- `components/editor/editor-surface.tsx`, `editor-toolbar-shell.tsx`, `editor-tab-strip.tsx`, `editor-textarea.tsx`, `editor-preview-frame.tsx`.
- `components/review/review-editor.tsx`, `conflict-block.tsx`, `rebase-progress.tsx`.

Article reader
- `app/[locale]/(public)/articles/articles-layout-client.tsx`, `chapter-nav-panel.tsx`, `chapter-nav/tree.tsx`, `mobile-chapter-nav-card.tsx`.
- `components/articles/article-metadata-layout.tsx`, `article-metadata-full.tsx`, `article-navigation.tsx`, `outline-rail.tsx`, `mobile-outline-bar.tsx`.
- `lib/markdown/components/*` — custom markdown rendering (no `prose` plugin).

Homepage
- `app/[locale]/_homepage/use-homepage-motion.ts`, `background-layer.tsx`, `midground-layer.tsx`, `foreground-layer.tsx`, `hero-card.tsx`, `decor-element.tsx`.

## Color Tokens

The Tailwind v4 theme is defined in `app/globals.css` (`@theme`). There is no `tailwind.config.*`. Use these tokens; avoid raw hex values.

| Token            | Hex       | Role                                                      |
| ---------------- | --------- | --------------------------------------------------------- |
| `tech-bg`        | `#f8f9fc` | Off-white page background and pale surface fills          |
| `tech-main`      | `#60708f` | Primary blueprint blue-gray for borders, controls, labels |
| `tech-main-dark` | `#4a5a78` | Headings and high-emphasis text                           |
| `tech-accent`    | `#c4d0df` | Hover fills, subtle highlights, selected states           |
| `tech-line`      | `#cbd5e1` | Border-only token: dot grid and quiet dividers            |

Usage rules
- Default text: `text-tech-main`. High-emphasis titles: `text-tech-main-dark`.
- Common borders: `border-tech-main/40`. Quiet guide lines: `guide-line` or `border-tech-main/20`.
- Surfaces: `bg-white/70`–`/95` plus `backdrop-blur-sm` (or `backdrop-blur-md` on hero/modal panels). Pale fills use `bg-tech-bg/50`–`/80`.
- Hover/selection stay muted: `bg-tech-accent/10`, `bg-tech-main/5`–`/10`, `hover:border-tech-main/60`.
- Semantic colors are translucent and bracketed: yellow/blue/green/red at `/10` fills with `/40` borders. Neutral states (loading, secondary metadata) may use gray/slate/zinc at low opacity.
- `tech-line` is for borders only; it has no fill or text utility in practice.

## Theming

### Semantic surface tokens

Map every background, border, and text color to a semantic Tailwind token so both themes resolve through CSS variables.

| Tailwind class | Light | Dark |
|---|---|---|
| `bg-tech-bg` | #f8f9fc | #0e1525 |
| `bg-surface` | #ffffff | #152038 |
| `bg-surface-overlay` | #ffffff | #1c2a4a |
| `bg-surface-input` | #ffffff | #0f1a2e |
| `bg-surface-modal` | #ffffff | #1a2540 |
| `text-tech-main` | #60708f | #a4b2cc |
| `text-tech-main-dark` | #4a5a78 | #cfd8e6 |
| `border-tech-line` | #cbd5e1 | #2a3349 |
| `text-tech-advanced` | #4c5b96 | #7a89c4 |
| `bg-tech-accent` | #c4d0df | #3a4866 |

### Dark variant conventions

- Use `dark:` Tailwind variant, scoped via `[data-theme="dark"]`.
- Never use `@media (prefers-color-scheme: dark)` in application code — the runtime `data-theme` attribute is the single source of truth.
- Replace hardcoded `bg-white` with `bg-surface` or `bg-surface-overlay`.
- Replace `text-slate-700` with `text-tech-main`, `text-slate-800/900` with `text-tech-main-dark`.

### Three.js background

Schematic viewer passes theme-aware background color to Three.js `renderer.setClearColor()`. Light: `#f8f9fc`, dark: `#0e1525`.

### Icon recoloring

Icons use `currentColor` or `text-tech-main`. When contained in a `dark:` block that changes text color, icons follow automatically.

### Color-scheme CSS property

`color-scheme: light` is set on `:root`; `color-scheme: dark` is set on `[data-theme="dark"]`. This controls native browser elements (scrollbars, form controls, system dialogs).

## Typography

Fonts are declared in `app/globals.css` and loaded via `app/[locale]/layout.tsx`.

Families
- Sans: `var(--font-geist-sans)`, `Noto Sans SC`, `PingFang SC`, `Microsoft YaHei`, `sans-serif`.
- Mono: `var(--font-geist-mono)`, `Space Mono`, `SF Mono`, `Consolas`, `Noto Sans Mono SC`, `monospace`.

Scale
- Root font size scales by viewport: `16px` on small screens, stepping up to `18px` on large screens via media queries in `html`.
- Page titles: `text-2xl md:text-4xl font-bold tracking-tight text-tech-main-dark uppercase`.
- Section titles: `text-lg md:text-xl font-bold tracking-widest uppercase text-tech-main-dark`, often above a guide line.
- HUD and metadata labels: `font-mono text-xs tracking-widest uppercase text-tech-main/50`.
- Body copy: `text-sm/relaxed` to `text-base/relaxed`.
- Article paragraphs: `font-sans text-base/relaxed text-slate-800`.
- Article headings (H1–H3): `markdown-title`, regular capitalization, with bottom or right guide lines. The title font currently resolves to Geist Sans via `--font-markdown-title` and can be adjusted independently from body and mono text.

Tracking
- House default: `tracking-widest` (broadly used on labels, badges, nav).
- Custom step: `tracking-tech-wide` (`0.2em`) for slightly tighter HUD text.

## Layout and Spacing

Mobile-first, modest spacing, predictable container rhythm.

- Page container: `page-container` = `mx-auto max-w-6xl space-y-8`. The `-pb` variant adds `pb-12`.
- Site chrome max-width inside the nav strip: `max-w-450` (a custom Tailwind v4 spacing alias).
- Common gutters: `p-4 sm:p-6`, `px-4 sm:px-6 lg:px-8`. Editor and reader pages may go wider (`max-w-[1400px]`, `lg:px-24`).
- Common grids: `grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3`.
- Page headers commonly stack on mobile and align on desktop: `flex flex-col gap-* md:flex-row md:items-end`.
- Touch targets meet `touch-target` (≥ `44px`) on buttons and primary controls.

12-column grid (asymmetric layouts)

Use this grid only when the page has asymmetric column allocations (sidebars, rails). Single-column pages use `page-container` instead.

- Container: `flex flex-col md:grid md:grid-cols-12 md:gap-6 md:max-w-360 md:mx-auto`. Mobile stacks vertically; grid activates at `md` (≥768px).
- Column allocation (default 3 | 7 | 2 split):
  - Left sidebar / nav: `md:col-span-3`
  - Main content: `md:col-span-7`, further capped at `max-w-3xl`
  - Right rail (TOC, related): `md:col-span-2`
- Variant: the footer uses a 4 | 8 split (`md:col-span-4` / `md:col-span-8`) with `md:gap-10` instead of `md:gap-6`.
- Current usages: article reader (`articles-layout-client.tsx`) and footer (`footer.tsx`).

## Navigation

Path: `components/layout/{site-shell,desktop-nav,mobile-nav,auth-aware-nav,auth-island,language-switcher}.tsx`.

Site shell
- `SiteShell` is the canonical frame: a sticky translucent top nav (`sticky top-0 z-50 border-b bg-white/60 backdrop-blur-sm`) over a full-width `main`.
- The footer is global but suppressed on `/` and on routes that call `HideFooter()`.

Desktop
- Hidden below `md`. Links are mono uppercase: `font-mono text-xs tracking-[0.15em] border-b-2 pb-1`.
- Active: `border-tech-main text-tech-main`. Inactive: transparent border + `text-tech-main-dark`, hover swaps both to `tech-main`.
- Admin-only links (e.g. `/review`) are injected by `AuthAwareNav` after a session check.

Mobile
- Hamburger button uses three `h-0.5 w-5 bg-tech-main` bars with animated transform states; touch target `min-h-11 min-w-11`.
- Drawer is portal-mounted under the top nav: `border-b border-tech-main/40 bg-white/95 backdrop-blur-md`, `duration-300` max-height transition.
- Drawer links are square bordered blocks with mono tracking and a hover fill.

Auth island and language switcher
- Unauthenticated users see a square `IN` login button. Authenticated users see an avatar with a hover dropdown to profile and sign-out.
- Language switcher is a 2-button segmented control (`Eng` / `中文`), square, monospace, locale-aware article-slug fallback.

## Surfaces

There is no single universal card. Several surface systems coexist; each is internally consistent.

`TechCard` (`components/ui/tech-card.tsx`)
- The default framed panel for feature, draft, review, and dashboard surfaces.
- Real props include: `tone`, `borderOpacity`, `background`, `padding`, `hover`, `brackets`, `bracketVariant`, `pattern` (`grid` only — `dots` is defined but unused).
- Conventions: thin `border-tech-main/40` borders, near-square geometry, optional `CornerBrackets`, hover changes border/fill opacity rather than adding elevation.

Editor surfaces (`components/editor/editor-surface.tsx`)
- A separate frame system used by the draft editor.
- Two visible variants: `default` (white/80 panel) and `grid` (grid-paper texture with inset shadow and corner ticks).
- Pairs with `EditorToolbarShell`, `EditorTabStrip`, `EditorTextarea` (CodeMirror), and `EditorPreviewFrame`.

Article reader shell
- A bordered translucent sheet around the entire reader: `border border-tech-main/40 bg-transparent p-6 sm:p-8` with corner brackets. This is its own surface, not a `TechCard`.

Profile and admin panels
- Custom panels with `border-tech-main/40 bg-white/60 backdrop-blur-md` and corner ticks. Used in profile and admin where `TechCard`’s API is too tight.

Selectable cards and segmented controls
- `SelectableCard` and `SegmentedControl` provide consistent radio-group / tab-group behavior with the same square, bordered, mono-label language.

Geometry guidance
- Default to square (`rounded-none`). Small radii are acceptable on dense indicators and skeletons (`rounded-sm`, `rounded-xs`, `rounded-[2px]`) and on circular dots (`rounded-full`). Reach for radii consciously, not by default.

## Buttons

`TechButton` is the primary control.

- Square geometry, border, bold mono uppercase text, wide tracking, `duration-300` transitions.
- Variants: `primary`, `secondary`, `danger`, `ghost`. Sizes: `sm`, `md`, `lg` (md/lg meet touch minimums).
- Non-ghost buttons include a small accent corner mark.
- Two hover rhythms exist on the site:
  - Color/fill change (default): `hover:bg-tech-main hover:text-white transition-colors`.
  - Scale transform (heroes, error pages, key CTAs): `hover:scale-[1.02] active:scale-95 transition-transform duration-300`.
- Avoid pill or fully-rounded CTAs unless a future design decision changes the system.

## Form Fields

`InputBox` and `TextAreaBox` are the canonical fields.

- Base: `border border-tech-main/30 bg-white/50 font-mono text-tech-main-dark`, square geometry, comfortable padding (`px-3 py-2.5 sm:px-4 sm:py-3`), min height `44px`.
- Focus is a deliberate border-color change (`focus:border-tech-main`) — fields do not use ring/outline.
- Error: red border and helper text, same square geometry.
- Provide visible labels and helper text near fields; placeholder-only labeling is not enough.
- Composition: form labels often live in a `FormField` with a left border accent and mono uppercase label.

## Status, Badges, Tags

Bracketed and translucent. Examples: `[Pending]`, `[Resolved]`, `[Closed]`.

- Base: `border px-2 py-0.5 font-mono text-xs tracking-wider`.
- Pending: yellow border/text on yellow `/10` fill.
- In progress / review: blue border/text on blue `/10` fill.
- Resolved / success: green border/text on green `/10` fill.
- Rejected / closed / destructive: red border/text on red `/10` fill.
- Neutral / loading: gray or slate at low opacity.
- Tags use `guide-line`, `bg-tech-main/5`, mono uppercase text, square borders.
- Pulsing status dots: `size-1.5 animate-pulse rounded-full bg-tech-main` for live indicators; reserve for state that actually updates.

## Decorative Motifs

Decoration should read as drafting overlay or instrumentation, not ornament.

Cross-verified motifs
- `CornerBrackets` (`components/ui/corner-brackets.tsx`) at `size-2`–`size-3`. Common variants: static frame, hover reveal, hover-only on `TechCard`, hover-expand on `TechCard`, diagonal pairs, top-bottom pairs.
- Thin guide lines: `guide-line`, `border-tech-main/20`, `section-divider`.
- Small square markers: `size-3 border border-tech-main/40 bg-tech-main/20`.
- Dot-grid backdrop on the body via a radial gradient using `tech-line` (mobile fixes grid size to `40px 40px`).
- Grid-paper texture on `EditorSurface variant="grid"` and `TechCard pattern="grid"`.
- Watermark + HUD label families on full-screen routes (auth, errors, homepage layers). Use them as a family, not as literal strings.
- Code/HUD readouts, hex dumps, isometric or radar diagrams, dimension marks (`|< ---- 640px ---- >|`).

Use `decor-desktop-only` to hide complex decoration on small screens.

Avoid
- One-off vignettes or radial glows unless they belong to a recurring surface system.
- Heavy drop shadows, conic gradients, or dense decorative SVG that does not appear elsewhere.
- Ornamental hover effects on elements that are not interactive.

## Motion

Motion lives in two distinct places.

CSS animation tokens (defined in `app/globals.css`, used across the site)

| Class                                 | Use                                       |
| ------------------------------------- | ----------------------------------------- |
| `animate-fade-in`                     | Simple appearance                         |
| `animate-slide-up-fade`               | Section/CTA entrance                      |
| `animate-tech-pop-in`                 | Primary panel entrance with scale + blur  |
| `animate-tech-slide-in`               | Heading or line reveal with clip-path     |
| `animate-tree-drop-in`                | Tree/sidebar/outline reveal               |
| `animate-blueprint-sweep` / `shimmer` | Scan/sweep highlight on loading or CTAs   |
| `animate-target-blink`                | Anchor-target confirmation                |
| `animate-scan-confirm`                | Loading → content handoff                 |
| `animate-skeleton-exit`               | Skeleton → content fade with translate    |

Homepage parallax (`app/[locale]/_homepage/*`)
- The only place that imports `motion/react`. Drives a single bespoke parallax/tilt/blur system built on `useMotionValue`, `useSpring`, and `useTransform`.
- Spring physics only (`damping`, `stiffness`); no shared duration/easing tokens.
- Honors reduced motion and mobile gating inside `use-homepage-motion.ts`.

Rules
- Prefer `transform`, `opacity`, and `clip-path`; avoid layout-shifting animation.
- Stagger entrances with `[animation-delay:*]` for hero and lists.
- Decorative motion must be optional: pair `animate-*` with `motion-reduce:animate-none` (or `motion-reduce:animate-fade-out`) wherever the animation is nontrivial. The loading and skeleton primitives in `components/ui/loading-shell-primitives.tsx` are the working reference.
- Pulsing dots are reserved for live or status indicators.

## Backgrounds and Overlays

- Body background is a radial dot grid using `tech-line`, with responsive grid sizing.
- Panels use `bg-white/60`–`/95` plus `backdrop-blur-sm` or `backdrop-blur-md`.
- Mobile drawers and full-screen overlays use a translucent dark scrim: `bg-tech-main-dark/20 backdrop-blur-xs` (or similar).
- Empty states may layer dashed borders over a low-opacity diagonal stripe background.
- Localized scanline / striped overlays exist (empty states, chapter nav panel, draft editor backdrop). Implementation is intentionally ad hoc; treat them as a vocabulary, not a single utility.

## Article Reader

The reader is its own layout, separate from the rest of the site chrome.

- Outer frame: bordered translucent sheet with corner brackets, large gutters.
- Desktop layout (3 columns):
  - Left chapter nav (`w-64 lg:w-80`), sticky, internally scrollable.
  - Center column: `md:max-w-2xl` (or `md:max-w-3xl` when nav hidden), `1920:max-w-4xl` on very wide screens.
  - Right outline rail: hidden until `sm`, `sticky`, `w-16` expanding to `w-52` on hover.
- Mobile layout: chapter nav becomes a top toggle + collapsible sheet, the outline rail becomes a bottom progress bar (`MobileOutlineBar`).
- Markdown is rendered with custom components in `lib/markdown/components/*`. The Tailwind typography plugin is not used; do not introduce `prose-*` classes.
- Code blocks use a custom chrome (language strip, line counts, wrap toggle, copy button) and a bordered light frame.
- Prev/next article navigation is a 2-column grid on `md`+, with `min-h-[44px]` touch targets.

## Loading

A coherent loading language exists; reach for it before inventing new spinners.

- `LoadingIndicator`: a pulsing `size-2` square dot with a mono uppercase label. The canonical inline loading treatment.
- `loading-shell-primitives.tsx` exposes `SegmentedBar`, `SweepOverlay`, `ScanConfirmOverlay`, and `SkeletonExitWrapper`. Route-level loading states use `SkeletonExitWrapper` with `aria-busy="true"` and an `aria-label`.
- `OperationProgress` provides a longer-running shell with `role="status" aria-live="polite"` and a `role="progressbar"` track.
- Mark async action buttons with `aria-busy` while pending; the system relies on this consistently.

## Interaction States

The system has clear conventions; apply them when writing or reviewing UI.

Focus
- Canonical: `focus-visible:outline-tech-main focus-visible:outline-2 focus-visible:outline-offset-2`. Use this for buttons, cards, segmented options, and nav links.
- Inputs are a deliberate exception: focus is a border-color change to `border-tech-main`, no outline or ring.
- Never set `focus:outline-none` without supplying a visible replacement.

Hover
- Default rhythm: color/fill change with `transition-colors` and `duration-200`–`duration-300`.
- CTA rhythm: scale transform — `hover:scale-[1.02] active:scale-95 transition-transform duration-300`. Reserve this for hero and primary call-to-action surfaces.

Active and disabled
- `active:scale-95` (or `[0.98]`) is the system pressed-state for the scale rhythm.
- Disabled controls dim with `opacity-50`–`opacity-60` and `cursor-not-allowed` (the latter is also handled globally in `app/globals.css`). Use `aria-busy` for in-flight async, `disabled`/`aria-disabled` for actually-blocked controls.

## Accessibility

The system reliably provides
- `aria-label` on icon-only controls (hamburger, search, language, close).
- `aria-busy` on async action buttons.
- `aria-live="polite"` on loading and status regions.
- `aria-expanded` on toggles (mobile nav, chapter tree, license, popovers).
- `role="status"` and `role="progressbar"` on `OperationProgress`.
- `motion-reduce:` fallbacks on the loading and skeleton primitives.
- A canonical focus-visible outline (see above).

Open gaps to be careful with when adding new UI
- Dialog/sheet focus trap and `aria-modal` are not provided centrally; supply them per-component.
- `aria-describedby` and `aria-labelledby` on dialogs/popovers are not consistent — set them when introducing a new overlay.
- Decorative `motion-*` animations outside the loading system do not have `motion-reduce:` fallbacks; add them when you reach for a new animation.

General rules
- Never disable zoom; preserve `viewport-fit=cover` and `initial-scale=1` from the root layout.
- Maintain ≥ `44px` touch targets on buttons, nav controls, and important links.
- Do not rely on hover-only affordances. Hover brackets and decorative reveals are decoration; clickable elements still need visible borders, labels, or icons.
- Mark purely decorative elements `pointer-events-none` and, where appropriate, `aria-hidden`.
- Hide dense technical decoration on mobile if it competes with content.
- Maintain readable contrast against translucent surfaces; body copy should not depend on full opacity.

## Implementation Checklist

Before adding or changing UI, check:

- [ ] Uses `tech-*` tokens instead of raw hex.
- [ ] Defaults to square geometry; reaches for radius consciously.
- [ ] Uses existing primitives (`TechCard`, `TechButton`, `InputBox`, `TextAreaBox`, `SelectableCard`, `SegmentedControl`, `CornerBrackets`, `PageHeader`, `SectionTitle`, `StatusBadge`, `StatusDot`) before inventing new ones.
- [ ] Picks the right surface system: `TechCard` for general panels, `EditorSurface` for editor work, the article shell for reader work, custom panels only when none of the above fit.
- [ ] Respects mobile-first layout and `44px` touch targets.
- [ ] Uses mono labels and HUD text intentionally, not for long prose.
- [ ] Keeps decorative HUD/grid/scan motifs subordinate to content.
- [ ] Uses motion from the existing `animate-*` catalog and avoids layout shift.
- [ ] Supplies a visible focus state — outline for controls, border-color for inputs.
- [ ] Pairs nontrivial decorative motion with a `motion-reduce:` fallback.
- [ ] Avoids emoji as structural icons; uses text, CSS geometry, or SVG instead.
