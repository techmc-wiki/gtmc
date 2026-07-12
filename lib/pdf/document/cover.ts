import { escapeHtml } from "./html-utils"
import type { BookOptions } from "./types"

/**
 * Title page: dot-grid paper, azure signal band, oversized serif title,
 * tagline, and a mono colophon line. Rendered as its own single-page PDF
 * pass (no running header/footer) and merged in front of the body.
 */
export function renderCoverHtml(options: BookOptions): string {
  const tagline = options.tagline
    ? `<p class="cover-tagline">${escapeHtml(options.tagline)}</p>`
    : ""
  const subtitle = options.subtitle
    ? `<p class="cover-subtitle">${escapeHtml(options.subtitle)}</p>`
    : ""

  return [
    '<section class="cover-page">',
    '  <div class="cover-band"></div>',
    '  <div class="cover-body">',
    '    <p class="cover-imprint">techmc.wiki</p>',
    `    <h1 class="cover-title">${escapeHtml(options.title)}</h1>`,
    `    ${subtitle}`,
    '    <hr class="cover-rule">',
    `    ${tagline}`,
    "  </div>",
    '  <div class="cover-foot">',
    `    <span>${options.locale === "zh" ? "中文版" : "English edition"}</span>`,
    `    <span>${escapeHtml(options.generatedDate)}</span>`,
    "  </div>",
    "</section>",
  ].join("\n")
}
