"use client"

import { useServerInsertedHTML } from "next/navigation"

/** Must stay synchronous and inline in the document head to set the theme before first paint. */
const noFlashScript = `
(function () {
  try {
    var match = document.cookie.match(/(?:^|;\\s*)theme=(light|dark|system)(?:;|$)/)
    var theme = match ? match[1] : "system"
    var resolved =
      theme === "light" || theme === "dark"
        ? theme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"

    document.documentElement.setAttribute("data-theme", resolved)
  } catch {}
})()
`

const NO_FLASH_HTML = { __html: noFlashScript }

/** `useServerInsertedHTML` runs only during server HTML generation, avoiding client-inserted script tags. */
export function ThemeScript() {
  useServerInsertedHTML(() => (
    <script key="theme-no-flash" dangerouslySetInnerHTML={NO_FLASH_HTML} />
  ))
  return null
}
