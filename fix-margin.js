const fs = require('fs');
let p = 'app/page.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('<main className="relative z-10 flex flex-col justify-center items-center w-full max-w-7xl mx-auto py-24 min-h-[max-content] px-4">', '<main className="relative z-10 flex flex-col justify-center items-center w-full max-w-7xl mx-auto py-24 min-h-[max-content] px-4 mt-[7vh]">');
fs.writeFileSync(p, c);
console.log('Fixed margin');
