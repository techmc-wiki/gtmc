function resolveTheme(): "light" | "dark" {
  const theme = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("theme="))
    ?.substring(6)

  if (theme === "light" || theme === "dark") return theme

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

try {
  document.documentElement.setAttribute("data-theme", resolveTheme())
} catch {}
