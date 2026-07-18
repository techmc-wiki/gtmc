/**
 * Resolve the persisted or system theme before the browser's first paint.
 * This must stay synchronous and inline in the document head.
 */
export const noFlashScript = `
(function () {
  try {
    var cookies = document.cookie.split(";")
    var theme = null

    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim()
      if (cookie.indexOf("theme=") === 0) {
        theme = cookie.substring(6)
        break
      }
    }

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
