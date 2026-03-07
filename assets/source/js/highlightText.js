// This plugin implements a custom syntax for highlighting text in markdowns: ==highlighted text==,
// which will be rendered as <mark>highlighted text</mark>.
(function () {
  function install(hook, _vm) {
    hook.beforeEach(function (html, next) {
      // 修改正则表达式，使其同时匹配 ```...``` 和 <code>...</code>
      // 使用 | (或) 操作符来组合两种模式
      const codeBlockRegex = /```[\s\S]*?```|`[\s\S]*?`/g;

      // 创建一个数组来存储所有匹配到的代码块
      const codeBlocks = [];
      // 将所有匹配到的代码块替换为占位符
      const htmlNoCodeBlock = html.replace(codeBlockRegex, (match) => {
        codeBlocks.push(match);
        // 返回一个统一的占位符
        return "CODE_BLOCK_PLACEHOLDER";
      });

      // 高亮逻辑保持不变
      const highlightRegex = /(?<!\\)==/g;
      let isOpen = true;
      const htmlHighlighted = htmlNoCodeBlock.replace(
        highlightRegex,
        (_match) => {
          if (isOpen) {
            isOpen = false;
            return `<mark>`;
          }
          isOpen = true;
          return `</mark>`;
        }
      );

      // 3. 处理转义字符：
      // 将之前被忽略的 "\==" 替换为 "=="
      const htmlUnescaped = htmlHighlighted.replace(/\\==/g, '==');

      // 4. 还原代码块
      let codeBlockIndex = 0;
      const htmlCodeBlockResumed = htmlUnescaped.replace(
        /CODE_BLOCK_PLACEHOLDER/g,
        () => codeBlocks[codeBlockIndex++]
      );

      next(htmlCodeBlockResumed);
    });
  }

  // Add the plugin to the window
  window.$docsify = window.$docsify || {}; // Ensure $docsify exists
  window.$docsify.plugins = [].concat(window.$docsify.plugins || [], install); // Simplified plugin registration
})();