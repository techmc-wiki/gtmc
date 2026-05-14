import peopleData from "@/data/people.json"

/** A single entry in people.json */
export type PeopleEntry = {
  name: string
  description: string
  profile: string
  email?: string
  social?: {
    github?: string
    bilibili?: string
    twitter?: string
    website?: string
    custom?: Array<{ label: string; url: string }>
  }
}

/** Runtime resolved person, guaranteed to always have a value */
export type ResolvedPerson = {
  key: string
  name: string
  description: string | null
  profile: string | null
  email: string | null
  social: {
    github?: string
    bilibili?: string
    twitter?: string
    website?: string
    custom?: Array<{ label: string; url: string }>
  }
  isFallback: boolean
}

export function normalizePeopleKey(raw: string): string {
  return raw.trim()
}

/**
 * Resolve a person key to a `ResolvedPerson`.
 *
 * Returns the matching entry from `data/people.json` when found, or a fallback
 * with `isFallback: true` when the key is unknown.
 */
export function resolvePerson(key: string): ResolvedPerson {
  const normalized = normalizePeopleKey(key)
  const { $schema: _, ...peopleEntries } = peopleData as Record<string, unknown>
  const entry = (peopleEntries as Record<string, PeopleEntry>)[normalized]

  if (entry) {
    return {
      key: normalized,
      name: entry.name,
      description: entry.description,
      profile: entry.profile,
      email: entry.email ?? null,
      social: entry.social ?? {},
      isFallback: false,
    }
  }

  return {
    key: normalized,
    name: normalized,
    description: null,
    profile: null,
    email: null,
    social: {},
    isFallback: true,
  }
}
