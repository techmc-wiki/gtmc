const fs = require('fs');
let c = fs.readFileSync('app/(dashboard)/articles/layout.tsx', 'utf8');

c = c.replace(
  'className="sticky top-[16px] md:top-20 hover:z-20 h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] flex flex-col"',
  'className="sticky top-[16px] md:top-[80px] hover:z-20 h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] flex flex-col"'
);

// We should also check the main body layout padding. The main body in layout.tsx has p-4 sm:p-6 lg:p-8
// But article layout has its own container. Let's make sure the stickiness aligns exactly.
// Currently the sticky threshold is top-20. 20 * 4 = 80px.
// But we might need to adjust the article layout offset since the wrapper has padding.

fs.writeFileSync('app/(dashboard)/articles/layout.tsx', c, 'utf8');
