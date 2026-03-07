(function() {
    function install(hook, vm) {
      hook.beforeEach(function(html, next) {
        const colorRegex = /(?<escape>\\?)<color\s(?<color>.+?)>/g;

        const newHtml = html.replace(colorRegex, (match, escape, color) => {

            if (escape == "\\") {
                return match
            }
            return `<color style="color: ${color}">`;
        });
  
        next(newHtml);
      });
    }
  
    // Add the plugin to the window
    window.$docsify = window.$docsify || {}; // Ensure $docsify exists
    window.$docsify.plugins = [].concat(window.$docsify.plugins || [], install);  // Simplified plugin registration
  })();