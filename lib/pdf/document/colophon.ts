import { escapeHtml } from "./html-utils"
import { getLabels } from "./labels"
import type { BookOptions } from "./types"

/** Closing colophon page: edition facts, license, and the canonical URL. */
export function renderColophonHtml(
  options: BookOptions,
  articleCount: number
): string {
  const labels = getLabels(options.locale)
  const url = options.sourceUrl ?? "https://techmc.wiki"

  const revisionLine = options.articlesRevision
    ? `    <p>${labels.colophonRevision} <code>${escapeHtml(options.articlesRevision)}</code></p>`
    : ""

  return [
    '<section class="colophon-page">',
    `  <h2 class="colophon-title">${labels.colophonTitle}</h2>`,
    '  <div class="colophon-body">',
    `    <p>${escapeHtml(options.title)} — ${articleCount} articles.</p>`,
    `    <p>${labels.colophonCommunity}</p>`,
    `    <p>${labels.colophonGenerated} ${escapeHtml(options.generatedDate)}.</p>`,
    revisionLine,
    `    <p>${labels.colophonLicense}</p>`,
    `    <p>${labels.colophonSource} <a href="${url}">${url.replace(/^https?:\/\//, "")}</a></p>`,
    "  </div>",
    "</section>",
  ]
    .filter(Boolean)
    .join("\n")
}
