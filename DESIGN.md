# GTMC Website Design System

This document records the existing visual system used by the GTMC website. It is a reference for future implementation work, not a redesign proposal. Source-of-truth examples live in `app/globals.css`, `components/ui/*`, and the homepage/dashboard page components.

## Design Direction

The site uses a **technical blueprint / scientific drafting** aesthetic:

- Flat, square, low-noise surfaces.
- Thin blue-gray borders and guide lines.
- Monospace labels, status readouts, and bracketed metadata.
- Corner brackets, ticks, grid backgrounds, scan lines, and measurement marks.
- Soft translucency through white overlays and `backdrop-blur-*`, not heavy shadows.
- Motion that feels like UI instrumentation: pop-in, clip-path reveal, pulse, shimmer, scan confirmation.

Avoid generic SaaS gradients, rounded pill cards, emoji-as-icons, heavy drop shadows, and ad-hoc color choices.

## Source Files

- Global tokens/utilities: `app/globals.css`
- Root layout/font injection: `app/[locale]/layout.tsx`
- Primary primitives: `components/ui/tech-card.tsx`, `components/ui/tech-button.tsx`, `components/ui/input-box.tsx`
- Decorative primitive: `components/ui/corner-brackets.tsx`
- Page headings and labels: `components/ui/page-header.tsx`, `components/ui/section-title.tsx`
- Status and metadata: `components/ui/status-badge.tsx`, `components/ui/status-dot.tsx`, `components/ui/tag-list.tsx`, `components/ui/card-header-row.tsx`
- Hero reference: `app/[locale]/_homepage/hero-card.tsx`, `app/[locale]/_homepage/background-layer.tsx`, `app/[locale]/_homepage/foreground-layer.tsx`
- Navigation reference: `app/[locale]/(dashboard)/desktop-nav.tsx`, `app/[locale]/(dashboard)/mobile-nav.tsx`

## Color Tokens

Use the Tailwind theme tokens from `app/globals.css` instead of hardcoded colors.

| Token            | Hex       | Role                                                      |
| ---------------- | --------- | --------------------------------------------------------- |
| `tech-bg`        | `#f8f9fc` | Off-white page background and pale surface fills          |
| `tech-main`      | `#60708f` | Primary blueprint blue-gray for borders, controls, labels |
| `tech-main-dark` | `#4a5a78` | Primary heading and high-emphasis text                    |
| `tech-accent`    | `#c4d0df` | Hover fills, subtle highlights, selected states           |
| `tech-line`      | `#cbd5e1` | Background grid dots and quiet divider lines              |

### Usage Rules

- Default text: `text-tech-main`; high-emphasis titles: `text-tech-main-dark`.
- Common borders: `border-tech-main/40`; quiet guide lines: `guide-line` or `border-tech-main/20`.
- Surface panels: `bg-white/80 backdrop-blur-sm`; hero glass panels may use `bg-white/60 backdrop-blur-md`.
- Selection/hover states should remain muted: `bg-tech-accent/10`, `bg-tech-main/10`, `hover:border-tech-main/60`.
- Semantic states are intentionally translucent: yellow/blue/green/red backgrounds at `/10` and borders at `/40`.

## Typography

Fonts are defined in `app/globals.css` and injected through `app/[locale]/layout.tsx`.

### Font Families

- Sans: `var(--font-geist-sans)`, `Noto Sans SC`, `PingFang SC`, `Microsoft YaHei`, `微软雅黑`, `sans-serif`.
- Mono: `var(--font-geist-mono)`, `Space Mono`, `SF Mono`, `Consolas`, `Noto Sans Mono SC`, `PingFang Mono`, `Microsoft YaHei Mono`, `monospace`.

### Scale and Hierarchy

- The root font size scales optically with viewport width: `16px` to `18px` through `clamp(...)` in `html`.
- Page titles: `text-2xl md:text-4xl font-bold tracking-tight text-tech-main-dark uppercase`.
- Hero titles: large, tight, mixed-weight sans text with `text-tech-main-dark` and `text-tech-main` layers.
- Section titles: `text-lg md:text-xl font-bold tracking-widest uppercase text-tech-main-dark` with bottom guide line.
- HUD labels: `font-mono text-xs tracking-widest uppercase text-tech-main/50`.
- Badges and metadata: `font-mono text-xs tracking-wider` or `tracking-widest`.

## Layout and Spacing

The layout is mobile-first and uses Tailwind breakpoints with consistent, modest spacing.

- Page container: `page-container` = `mx-auto max-w-6xl space-y-8 px-6`.
- Page container with bottom room: `page-container-pb` = `mx-auto max-w-6xl space-y-8 px-6 pb-12`.
- Safe container: `container-safe` prevents horizontal overflow and centers at `md`+.
- Common responsive padding: `p-4 sm:p-6`, `px-4 sm:px-6 lg:px-8`.
- Common grids: `grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3`.
- Common page header layouts: `flex flex-col ... md:flex-row md:items-end`.
- Navigation switches from mobile drawer to desktop links at `md`.
- Interactive elements should meet the existing `touch-target` rule: minimum `44px` by `44px` on touch screens.

## Surfaces and Components

### Cards

Use `TechCard` for default panel/card work.

```tsx
<TechCard className="border-tech-main/40 bg-white/80 p-6 backdrop-blur-sm">
  ...
</TechCard>
```

Card conventions:

- Square corners; do not add border radius.
- Thin blueprint borders, usually `border-tech-main/40`.
- `CornerBrackets` are part of the card language.
- Hover changes should alter border/fill opacity, not add large elevation.
- Preferred depth is offset geometry, guide lines, overlays, or `backdrop-blur-sm`, not large shadows.

### Buttons

Use `TechButton` for primary actions.

- Base language: square controls, border, bold text, wide tracking, `duration-300` transitions.
- Variants: `primary`, `secondary`, `danger`, `ghost`.
- `md` and `lg` sizes include mobile touch minimums.
- Non-ghost buttons include the small lower-right technical corner mark.

Avoid rounded pill CTAs unless a future design decision explicitly changes the system.

### Inputs

Use `InputBox` for input fields.

- Base: `border border-tech-main/30 bg-white/50 font-mono text-tech-main-dark`.
- Focus: `focus:border-tech-main`.
- Error: red border/text with the same square geometry.
- Keep visible labels/helper text near forms; do not rely on placeholder-only labeling.

### Status Badges and Tags

Status badges use bracketed labels: `[Pending]`, `[Resolved]`, etc.

- Base: `border px-2 py-0.5 font-mono text-xs tracking-wider`.
- Pending: yellow border/text on yellow `/10` fill.
- In progress/review: blue border/text on blue `/10` fill.
- Resolved/success: green border/text on green `/10` fill.
- Rejected/closed/destructive: red border/text on red `/10` fill.
- Tags use `guide-line`, `bg-tech-main/5`, mono uppercase text, and square borders.

## Decorative Motifs

Decorative elements should look like drafting overlays or instrumentation, not ornament for its own sake.

Preferred motifs:

- `CornerBrackets` with `size-2` or `size-3`.
- Thin guide lines: `guide-line`, `border-tech-main/20`, `section-divider`.
- Small square markers: `size-3 border border-tech-main/40 bg-tech-main/20`.
- Pulsing status dots: `size-1.5 animate-pulse rounded-full bg-tech-main`.
- Dimension marks, e.g. `|< ---- 640px ---- >|` in mono text.
- Code/HUD readouts, hex dumps, matrix notation, scan lines, and isometric technical diagrams.
- Dot grid background from the body radial gradient.

Use `decor-desktop-only` for complex decoration that should disappear on small screens.

## Motion

Motion tokens are defined in `app/globals.css`.

| Animation                             | Use                                    |
| ------------------------------------- | -------------------------------------- |
| `animate-fade-in`                     | Simple appearance                      |
| `animate-slide-up-fade`               | Standard section/CTA entrance          |
| `animate-tech-pop-in`                 | Primary panel entrance with scale/blur |
| `animate-tech-slide-in`               | Heading or line reveal with clip-path  |
| `animate-tree-drop-in`                | Tree/sidebar reveal                    |
| `animate-blueprint-sweep` / `shimmer` | Scan/sweep highlight                   |
| `animate-target-blink`                | Anchor-target confirmation             |
| `animate-scan-confirm`                | Scan confirmation overlay              |

Motion rules:

- Prefer `transform`, `opacity`, and `clip-path`; avoid layout-shifting animations.
- Use staggered `[animation-delay:*]` for hero and list entrances.
- Use pulsing dots sparingly for live/status indicators.
- Decorative desktop motion should not be required for comprehension.

## Backgrounds and Overlays

- The body background uses a radial dot grid with `tech-line` at responsive grid sizes.
- Mobile fixes grid size to `40px 40px`.
- Panels often use `bg-white/60` to `bg-white/95` plus `backdrop-blur-sm` or `backdrop-blur-md`.
- Mobile drawers use a translucent dark technical scrim: `bg-tech-main-dark/20 backdrop-blur-xs`.
- Empty states can use dashed borders plus low-opacity diagonal stripe backgrounds.

## Navigation

### Desktop

- Hidden below `md` with `hidden md:flex`.
- Link style: `font-mono text-xs tracking-[0.15em] border-b-2 pb-1`.
- Active state: `border-tech-main text-tech-main`.
- Inactive state: transparent border, `text-tech-main-dark`, hover border/text moves to `tech-main`.

### Mobile

- Hamburger button uses three `h-0.5 w-5 bg-tech-main` bars and animated transform states.
- Touch target: `min-h-11 min-w-11`.
- Drawer: fixed under the top nav, `border-b border-tech-main/40 bg-white/95 backdrop-blur-md`, `duration-300` max-height transition.
- Drawer links: square bordered blocks with mono tracking and hover fill.

## Accessibility and Responsiveness

- Preserve `viewport-fit=cover` and `initial-scale=1`; never disable zoom.
- Keep touch targets at least `44px` square for buttons, nav controls, and important links.
- Do not rely on hover-only affordances. Hover brackets are decorative; clickable elements still need visible labels and borders.
- Preserve visible focus states when introducing custom controls.
- Decorative elements should be `pointer-events-none` where appropriate.
- Hide dense technical decoration on mobile if it competes with content.
- Maintain enough contrast when using low-opacity `tech-main`; body copy should stay readable against translucent surfaces.

## Implementation Checklist

Before adding or changing UI, check:

- [ ] Uses `tech-*` tokens instead of ad-hoc colors.
- [ ] Keeps square geometry and thin border language.
- [ ] Uses existing primitives (`TechCard`, `TechButton`, `InputBox`, `PageHeader`, `SectionTitle`, `CornerBrackets`) when possible.
- [ ] Respects mobile-first layouts and `44px` touch targets.
- [ ] Uses mono labels/status text intentionally, not for long prose.
- [ ] Keeps decorative HUD/grid/scan motifs secondary to content.
- [ ] Uses motion from the existing animation catalog and avoids layout shift.
- [ ] Avoids emoji as structural icons; use text, CSS geometry, or SVG icons instead.
