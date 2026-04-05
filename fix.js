const fs = require("fs")
let code = fs.readFileSync("litematica-renderer/src/renderer.ts", "utf8")
code = code.replace(
  /const currentVal = props\[k\];\s+const expectedVals = String\(v\)\.split\('\|'\);\s+if \(\!expectedVals\.includes\(currentVal\)\) \{/,
  "let currentVal = props[k];\n" +
    "                if (currentVal === undefined) {\n" +
    "                   if (k === 'waterlogged' || String(v).includes('false')) currentVal = 'false';\n" +
    "                   else if (String(v).includes('none')) currentVal = 'none';\n" +
    "                   else if (k === 'power') currentVal = '0';\n" +
    "                   else if (k === 'up' && cleanName.includes('wall')) currentVal = 'true';\n" +
    "                   else currentVal = '';\n" +
    "                }\n" +
    "                const expectedVals = String(v).split('|');\n" +
    "                if (!expectedVals.includes(currentVal)) {"
)
fs.writeFileSync("litematica-renderer/src/renderer.ts", code)
