/** Must stay synchronous and inline in the document head to set the theme before first paint. */
export const noFlashScript = `
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
