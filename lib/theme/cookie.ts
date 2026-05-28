import type { Theme } from "./types"

export const THEME_COOKIE = "theme"
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function parseThemeCookie(raw: string): Theme | null {
  const match = raw.match(/(?:^|;\s*)theme=(light|dark|system)/)
  return match ? (match[1] as Theme) : null
}

export function serializeThemeCookie(theme: Theme): string {
  if (theme === "system") {
    return `${THEME_COOKIE}=; path=/; max-age=0; SameSite=Lax`
  }
  return `${THEME_COOKIE}=${theme}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}
