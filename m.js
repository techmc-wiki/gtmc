const fs = require('fs');
let c = fs.readFileSync('app/(dashboard)/layout.tsx', 'utf8');
console.log(c.match(/<main className="([^"]+)">/)[1]);
