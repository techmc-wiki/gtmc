import React from "react"

/**
 * Speculation Rules API — progressive enhancement for cross-document prerender.
 *
 * Browsers that support the API (Chromium 121+) will prerender matched URLs on
 * moderate user intent (~200ms hover). Other browsers ignore this script.
 *
 * Prerender fetches the destination's HTML, CSS, JS, fonts, and images in the
 * background, so when the user clicks, the page is already rendered — FCP/LCP
 * for the navigation event approach zero.
 *
 * {@link https://developer.chrome.com/docs/web-platform/speculation-rules}
 */
const SPECULATION_RULES = {
  prerender: [
    {
      where: {
        and: [
          { href_matches: "/*/articles/**" },
          { not: { href_matches: "/**/edit/**" } },
        ],
      },
      eagerness: "moderate",
    },
    {
      where: { href_matches: "/*/glossary*" },
      eagerness: "moderate",
    },
  ],
} as const

const RULES_JSON = JSON.stringify(SPECULATION_RULES)

// Hoisted: see react-perf/jsx-no-new-object-as-prop
const RULES_HTML = { __html: RULES_JSON }

export function SpeculationRules() {
  return <script type="speculationrules" dangerouslySetInnerHTML={RULES_HTML} />
}
