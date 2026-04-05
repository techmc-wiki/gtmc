const fs = require('fs');
let code = fs.readFileSync('litematica-renderer/src/renderer.ts', 'utf8');

const regex = /const currentVal = props\[k\];\s+const expectedVals = String\(v\)\.split\('\|'\);\s+if \(\!expectedVals\.includes\(currentVal\)\) \{/g;

const replacement = \let currentVal = props[k];
                if (currentVal === undefined) {
                   if (k === 'waterlogged' || String(v).includes('false')) currentVal = 'false';
                   else if (String(v).includes('none')) currentVal = 'none';
                   else if (k === 'power') currentVal = '0';
                   else if (k === 'up' && cleanName.includes('wall')) currentVal = 'true';
                   else currentVal = ''; 
                }
                const expectedVals = String(v).split('|');
                if (!expectedVals.includes(currentVal)) {\;

code = code.replace(regex, replacement);
fs.writeFileSync('litematica-renderer/src/renderer.ts', code);
