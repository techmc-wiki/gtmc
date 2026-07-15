import { parseThemeCookie } from "./cookie"
import { getSystemThemeSnapshot } from "./system-theme"

export function applyInitialTheme(): void {
  const theme = parseThemeCookie(document.cookie)
  const resolvedTheme =
    theme === "light" || theme === "dark" ? theme : getSystemThemeSnapshot()

  document.documentElement.setAttribute("data-theme", resolvedTheme)
}
