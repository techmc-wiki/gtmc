import { readFileSync } from "node:fs"
import { join } from "node:path"
import { load as yamlLoad } from "js-yaml"

/** A single entry in people.yml */
export type PeopleEntry = {
  name: string
  description?: string
  profile?: string
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

type PeopleYaml = Record<string, PeopleEntry>

const PEOPLE_YAML_PATH = join(
  process.cwd(),
  "lib",
  "articles",
  "config",
  "people.yml"
)

let peopleCache: PeopleYaml | null = null

function loadPeople(): PeopleYaml {
  if (peopleCache !== null) {
    return peopleCache
  }
  const raw = readFileSync(PEOPLE_YAML_PATH, "utf8")
  const parsed = yamlLoad(raw)
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("people.yml must parse to a YAML mapping of people entries")
  }
  peopleCache = parsed as PeopleYaml
  return peopleCache
}

function normalizePeopleKey(raw: string): string {
  return raw.trim()
}

/**
 * Resolve a person key to a `ResolvedPerson`.
 *
 * Returns the matching entry from `lib/articles/config/people.yml` when found,
 * or a fallback with `isFallback: true` when the key is unknown.
 */
export function resolvePerson(key: string): ResolvedPerson {
  const normalized = normalizePeopleKey(key)
  const people = loadPeople()
  const entry = people[normalized]

  if (entry) {
    return {
      key: normalized,
      name: entry.name,
      description: entry.description ?? null,
      profile: entry.profile ?? null,
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
