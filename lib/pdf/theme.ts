/**
 * PDF design tokens — the single source of truth for the print edition's
 * look. Mirrors the site's archival-book identity (DESIGN.md): warm paper,
 * ink-gray text, serif display faces, and a strictly budgeted blueprint-azure
 * signal. Values are consumed by `print.css` (via injected CSS custom
 * properties) and by the Chromium header/footer templates.
 */

export const PDF_COLORS = {
  /** Warm archival-paper page background (site `tech-bg`). */
  paper: "#f5f4ef",
  /** Slightly lifted surface for code blocks, tables, callouts. */
  surface: "#fcfbf8",
  /** Ink-gray for secondary text, borders, apparatus (site `tech-main`). */
  ink: "#4a5468",
  /** Navy-black ink for body text and headings (site `tech-main-dark`). */
  inkDark: "#20283c",
  /** Pale blue-gray for subtle fills and selected states (site `tech-accent`). */
  accent: "#c9cfdd",
  /** Warm hairline for quiet rules and the dot grid (site `tech-line`). */
  line: "#d6d3c8",
  /** Blueprint azure — budgeted: ticks, chapter numerals, active accents. */
  signal: "#1d6a96",
  /** Text guaranteed legible on a `signal` fill. */
  signalInk: "#f5f4ef",
} as const

export const PDF_FONTS = {
  /** Body text. */
  sans: `"Geist", "Noto Sans SC", "PingFang SC", sans-serif`,
  /** Display: cover title, chapter numerals, article/section headings. */
  serif: `"STIX Two Text", "Noto Serif SC", "Songti SC", Georgia, serif`,
  /** Apparatus: labels, folios, captions, code. */
  mono: `"Geist Mono", "Noto Sans Mono SC", monospace`,
} as const

/**
 * Google Fonts stylesheet covering every family above (EN + SC subsets).
 * Loaded once from the assembled HTML document.
 */
export const PDF_FONT_STYLESHEET_URL =
  "https://fonts.googleapis.com/css2" +
  "?family=Geist:wght@400;500;600" +
  "&family=Geist+Mono:wght@400;700" +
  "&family=STIX+Two+Text:ital,wght@0,400;0,600;0,700;1,400" +
  "&family=Noto+Sans+SC:wght@400;500;700" +
  "&family=Noto+Serif+SC:wght@400;600;700" +
  "&display=swap"

/** Fonts that must be confirmed loaded before `page.pdf()` renders. */
export const PDF_REQUIRED_FONTS = [
  '16px "Geist"',
  '16px "Geist Mono"',
  '16px "STIX Two Text"',
  '16px "Noto Sans SC"',
  '16px "Noto Serif SC"',
] as const

/**
 * Chromium's `headerTemplate`/`footerTemplate` render in an isolated page
 * that cannot load webfonts, so the running apparatus falls back to system
 * mono. Colors stay on-palette.
 */
// Single-quoted family names: these strings are interpolated into a
// double-quoted style="…" attribute, where an inner double quote would
// terminate the attribute and silently drop every declaration after it.
const RUNNING_FONT = `ui-monospace, 'SF Mono', Menlo, Consolas, monospace`

// Chromium's template renderer ignores flex/grid on the root element, so
// both templates rely on width:100% + text-align, which it does honor.
export function buildHeaderTemplate(bookTitle: string): string {
  return (
    `<div style="font-size:7pt; font-family:${RUNNING_FONT}; ` +
    `color:${PDF_COLORS.ink}; width:100%; text-align:center; ` +
    `padding-top:8px; letter-spacing:0.22em; text-transform:uppercase; ` +
    `-webkit-print-color-adjust:exact;">` +
    `${bookTitle} <span style="color:${PDF_COLORS.signal};">&#9632;</span>` +
    `</div>`
  )
}

export function buildFooterTemplate(): string {
  return (
    `<div style="font-size:8pt; font-family:${RUNNING_FONT}; ` +
    `color:${PDF_COLORS.ink}; width:100%; text-align:center; ` +
    `padding-bottom:6px; letter-spacing:0.08em; ` +
    `-webkit-print-color-adjust:exact;">` +
    `<span class="pageNumber"></span>` +
    `</div>`
  )
}

/** CSS custom properties block injected ahead of `print.css`. */
export function buildThemeCssVariables(): string {
  return [
    ":root {",
    `  --pdf-paper: ${PDF_COLORS.paper};`,
    `  --pdf-surface: ${PDF_COLORS.surface};`,
    `  --pdf-ink: ${PDF_COLORS.ink};`,
    `  --pdf-ink-dark: ${PDF_COLORS.inkDark};`,
    `  --pdf-accent: ${PDF_COLORS.accent};`,
    `  --pdf-line: ${PDF_COLORS.line};`,
    `  --pdf-signal: ${PDF_COLORS.signal};`,
    `  --pdf-signal-ink: ${PDF_COLORS.signalInk};`,
    `  --pdf-font-sans: ${PDF_FONTS.sans};`,
    `  --pdf-font-serif: ${PDF_FONTS.serif};`,
    `  --pdf-font-mono: ${PDF_FONTS.mono};`,
    "}",
  ].join("\n")
}
