/** Omit unavailable optional properties; every builder requires `siteUrl` without a trailing slash. */

import type { ResolvedPerson } from "@/lib/markdown/people"

export type JsonLdObject = {
  "@context": "https://schema.org"
  "@type": string
  [key: string]: unknown
}

export function serializeJsonLd(value: unknown): { __html: string } {
  return { __html: JSON.stringify(value).replaceAll("<", "\\u003c") }
}

/** Additional canonical, credible profile URLs to append to the default GitHub organization profile. */
export type OrganizationJsonLdOptions = {
  sameAs?: string[]
}

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
      url: `${siteUrl}/logo-mark-light.svg`,
      width: 100,
      height: 100,
    },
    sameAs,
  }
}

/**
 * `handle` must already be URL-encoded. Bare supported social handles are
 * normalized to canonical profile URLs; full URLs pass through unchanged.
 */
export function buildPersonJsonLd(
  person: ResolvedPerson,
  siteUrl: string,
  locale: string,
  handle: string,
  options: { role?: string } = {}
): JsonLdObject {
  const profileUrl = `${siteUrl}/${locale}/authors/${handle}`
  const personId = `${profileUrl}#person`
  const decodedHandle = decodeURIComponent(handle)

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
    "@id": personId,
    name: person.name,
    url: profileUrl,
    affiliation: {
      "@type": "Organization",
      name: "Graduate Texts in Minecraft",
      url: siteUrl,
    },
  }

  if (person.name.toLowerCase() !== decodedHandle.toLowerCase()) {
    personObject.alternateName = decodedHandle
  }

  if (options.role) {
    personObject.jobTitle = options.role
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
    name: options.role ? `${person.name} (${options.role})` : person.name,
    inLanguage: locale,
    ...(person.description ? { description: person.description } : {}),
    mainEntity: personObject,
  }
}

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
