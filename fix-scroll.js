const fs = require('fs');
let c = fs.readFileSync('app/(dashboard)/articles/layout.tsx', 'utf8');

c = c.replace(
  /className="py-4 md:py-6 pl-3 md:pl-6 pr-2 flex-1 text-tech-main max-h-\[50vh\] md:max-h-none border-b md:border-b-0 border-tech-main\/20 mb-6 md:mb-0 relative group flex flex-col pt-0 md:pt-0 pl-0 md:pl-0"/,
  'className="py-4 md:py-6 pl-3 md:pl-6 pr-2 flex-1 min-h-0 text-tech-main max-h-[50vh] md:max-h-none border-b md:border-b-0 border-tech-main/20 mb-6 md:mb-0 relative group flex flex-col pt-0 md:pt-0 pl-0 md:pl-0"'
);

c = c.replace(
  /className="overflow-y-auto flex-1 custom-left-scrollbar h-full pl-3 md:pl-6 -mt-2"/,
  'className="overflow-y-auto flex-1 min-h-0 custom-left-scrollbar h-full pl-3 md:pl-6 -mt-2"'
);

fs.writeFileSync('app/(dashboard)/articles/layout.tsx', c, 'utf8');
console.log('Fixed min-h-0');
