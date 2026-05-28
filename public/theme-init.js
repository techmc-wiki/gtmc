;(function () {
  try {
    var cookies = document.cookie.split(";")
    var theme = null
    for (var i = 0; i < cookies.length; i++) {
      var c = cookies[i].trim()
      if (c.indexOf("theme=") === 0) {
        theme = c.substring(6)
        break
      }
    }
    var resolved
    if (theme === "light" || theme === "dark") {
      resolved = theme
    } else {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
    }
    document.documentElement.setAttribute("data-theme", resolved)
  } catch {}
})()
