const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf8');

const fontDef = \
@theme {
  --font-sans: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Î¢ÈíÑÅºÚ", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;\;

if (!css.includes('--font-sans:')) {
    css = css.replace('@theme {', fontDef);
    fs.writeFileSync('app/globals.css', css);
    console.log('Font updated in globals.css');
} else {
    console.log('Font already defined');
}
