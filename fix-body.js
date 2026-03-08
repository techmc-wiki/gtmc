const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf8');
css = css.replace(/body\s*\{[\s\S]*?\}/, 'body {\n  background-color: var(--background);\n  color: var(--foreground);\n  font-family: var(--font-sans);\n}');
fs.writeFileSync('app/globals.css', css);
console.log('Fixed body');
