export const PDF_COLORS = {
  paper: "#f5f4ef",
  surface: "#fcfbf8",
  ink: "#4a5468",
  inkDark: "#20283c",
  accent: "#c9cfdd",
  line: "#d6d3c8",
  signal: "#1d6a96",
  signalInk: "#f5f4ef",
} as const

export const PDF_FONTS = {
  sans: `"Geist", "Noto Sans SC", "PingFang SC", sans-serif`,
  serif: `"STIX Two Text", "Noto Serif SC", "Songti SC", Georgia, serif`,
  // Google Fonts does not serve Noto Sans Mono SC. Precede its system fallback
  // with Noto Sans SC so headless Chromium can render CJK fallback glyphs.
  mono: `"Geist Mono", "Noto Sans SC", "Noto Sans Mono SC", monospace`,
} as const

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
