/**
 * Framework-agnostic schema.org JSON-LD builders.
 *
 * These helpers construct plain JSON objects (no React/Next.js APIs) so they
 * can be reused from server components, route handlers, scripts, or tests.
 *
 * Builders always omit optional fields when the value is absent — schema.org
 * consumers treat missing keys cleaner than explicit `null` values.
 */

import type { ResolvedPerson } from "@/lib/markdown/people"

// --- Shared JSON-LD types ----------------------------------------------------

/**
 * Minimal structural shape for a tagged JSON-LD node. Builders declare their
 * own concrete return types; this just guarantees `@context` / `@type` exist.
 */
export type JsonLdObject = {
  "@context": "https://schema.org"
  "@type": string
  [key: string]: unknown
}

export function serializeJsonLd(value: unknown): { __html: string } {
  return { __html: JSON.stringify(value).replaceAll("<", "\\u003c") }
}

// --- Organization ------------------------------------------------------------

/**
 * Optional enrichment for the Organization schema. Callers may supply
 * additional `sameAs` profile URLs when they are known and credible.
 */
export type OrganizationJsonLdOptions = {
  /** Additional canonical profile URLs beyond the default GitHub org. */
  sameAs?: string[]
}

/** Concrete Organization node returned by {@link buildOrganizationJsonLd}. */
export type OrganizationJsonLd = {
  "@context": "https://schema.org"
  "@type": "Organization"
  name: string
  alternateName: string
  url: string
  description: string
  foundingDate: string
  logo: {
    "@type": "ImageObject"
    url: string
    width: number
    height: number
  }
  sameAs: string[]
}

/**
 * Build the GTMC Organization schema.org object.
 *
 * Preserves the historical name / url / description / logo / foundingDate
 * behavior that previously lived inline in `app/[locale]/layout.tsx`. The
 * default `sameAs` list contains the GitHub org; callers may append more
 * via `options.sameAs`.
 *
 * @param siteUrl Absolute site origin (no trailing slash), e.g. `https://beta.techmc.wiki`.
 */
export function buildOrganizationJsonLd(
  siteUrl: string,
  options: OrganizationJsonLdOptions = {}
): OrganizationJsonLd {
  const baseSameAs = ["https://github.com/techmc-wiki/gtmc"]
  const sameAs = [...baseSameAs, ...(options.sameAs ?? [])]

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Graduate Texts in Minecraft",
    alternateName: "GTMC",
    url: siteUrl,
    description:
      "Graduate Texts in Technical Minecraft - collaboratively written comprehensive textbook for technical Minecraft.",
    foundingDate: "2024",
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/favicon.svg`,
      width: 100,
      height: 100,
    },
    sameAs,
  }
}

// --- Person ------------------------------------------------------------------

/**
 * Build a schema.org ProfilePage with the author as its main entity.
 *
 * @param person   The resolved person record (from `resolvePerson`).
 * @param siteUrl  Absolute site origin, used to build the profile URL.
 * @param locale   Locale segment used by the profile route.
 * @param handle   URL-encoded author handle used by the profile route.
 *
 * Optional fields (description, image/avatar, social links) are only emitted
 * when present, avoiding null-heavy schema. `sameAs` aggregates every supported
 * social URL (github, bilibili, twitter, website, custom entries); bare handles
 * are normalized to canonical platform URLs, full URLs pass through unchanged.
 */
export function buildPersonJsonLd(
  person: ResolvedPerson,
  siteUrl: string,
  locale: string,
  handle: string
): JsonLdObject {
  const profileUrl = `${siteUrl}/${locale}/authors/${handle}`

  const sameAs: string[] = []
  if (person.social.github) {
    sameAs.push(
      person.social.github.startsWith("http")
        ? person.social.github
        : `https://github.com/${person.social.github}`
    )
  }
  if (person.social.bilibili) {
    sameAs.push(
      person.social.bilibili.startsWith("http")
        ? person.social.bilibili
        : `https://space.bilibili.com/${person.social.bilibili}`
    )
  }
  if (person.social.twitter) {
    sameAs.push(
      person.social.twitter.startsWith("http")
        ? person.social.twitter
        : `https://twitter.com/${person.social.twitter}`
    )
  }
  if (person.social.website) {
    sameAs.push(person.social.website)
  }
  for (const custom of person.social.custom ?? []) {
    if (custom.url) {
      sameAs.push(custom.url)
    }
  }

  const personObject: Record<string, unknown> = {
    "@type": "Person",
    name: person.name,
    url: profileUrl,
  }

  if (person.description) {
    personObject.description = person.description
  }
  if (person.profile) {
    personObject.image = person.profile.startsWith("http")
      ? person.profile
      : `${siteUrl}${person.profile.startsWith("/") ? "" : "/"}${person.profile}`
  }
  if (sameAs.length > 0) {
    personObject.sameAs = sameAs
  }

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: profileUrl,
    mainEntity: personObject,
  }
}

// --- WebPage -----------------------------------------------------------------

/**
 * Build a schema.org WebPage object for a site page.
 *
 * @param siteUrl    Absolute site origin (no trailing slash).
 * @param routePath  Route path beginning with `/` (e.g. `/en/about`). Combined with siteUrl to form the canonical URL.
 * @param name       Human-readable page title.
 * @param description Optional page description.
 */
export function buildWebPageJsonLd(
  siteUrl: string,
  routePath: string,
  name: string,
  description?: string
): JsonLdObject {
  const normalizedPath = routePath.startsWith("/") ? routePath : `/${routePath}`
  const url = `${siteUrl}${normalizedPath}`

  const webPage: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    url,
  }

  if (description) {
    webPage.description = description
  }

  return webPage
}
