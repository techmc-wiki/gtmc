const fs = require('fs');
let c = fs.readFileSync('app/(dashboard)/articles/layout.tsx', 'utf8');

c = c.replace(
  'className="sticky top-[16px] md:top-20 hover:z-20 h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] flex flex-col"',
  'className="md:sticky md:top-[105px] lg:top-[113px] hover:z-20 md:h-[calc(100vh-105px)] lg:h-[calc(100vh-113px)] flex flex-col"'
);

fs.writeFileSync('app/(dashboard)/articles/layout.tsx', c, 'utf8');
console.log('Fixed sticky offsets');
