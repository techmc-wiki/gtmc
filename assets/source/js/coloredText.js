(function() {
  function install(hook, vm) {
    hook.beforeEach(function(html, next) {
      // Regular expression to find #color:colorname{text} or #RRGGBB{text}
      const colorRegex = /(?<escapeColor>\\?)(?<colorSpecifier>#color:[a-z]+)\{(?<text>.+?)(?<!\\)}|(?<escapeHex>\\?)(?<hexColor>#[0-9a-fA-F]{6})\{(?<hexText>.+?)(?<!\\)}/g;

      // Replace matches with colored spans
      const newHtml = html.replace(colorRegex, (match, escapeColor, colorSpecifier, text, escapeHex, hexColor, hexText) => {
        let colorValue;
        let finalText;
        let escapeUsed;

        if (colorSpecifier) { // It's a #color:colorname{} format
          escapeUsed = escapeColor;
          colorValue = colorSpecifier.substring(7);
          finalText = text;
        } else if (hexColor) { // It's a #RRGGBB{} format
          escapeUsed = escapeHex;
          if (!/^[0-9a-fA-F]{6}$/.test(hexColor.slice(1))) {
            console.warn("Invalid hex color code:", hexColor, "in:", match);
            return match;
          }
          colorValue = hexColor;
          finalText = hexText;
        } else {
          return match; // No match, should not happen.  Safety net.
        }


        if (escapeUsed === "\\") {
          return match.slice(1); // Remove the escape character
        }


        return `<span style="color: ${colorValue} !important;">${finalText}</span>`;
      });

      next(newHtml);
    });
  }

  // Add the plugin to the window
  window.$docsify = window.$docsify || {}; // Ensure $docsify exists
  window.$docsify.plugins = [].concat(window.$docsify.plugins || [], install);  // Simplified plugin registration
})();