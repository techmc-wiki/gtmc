const fs = require('fs');
let c = fs.readFileSync('app/(dashboard)/articles/layout.tsx', 'utf8');

c = c.replace(
  /<div className="py-4 md:py-6 pl-3 md:pl-6 pr-2 overflow-y-auto flex-1 text-tech-main custom-left-scrollbar max-h-\[50vh\] md:max-h-none border-b md:border-b-0 border-tech-main\/20 mb-6 md:mb-0 relative group">/,
  '<div className="py-4 md:py-6 pl-3 md:pl-6 pr-2 flex-1 text-tech-main max-h-[50vh] md:max-h-none border-b md:border-b-0 border-tech-main/20 mb-6 md:mb-0 relative group flex flex-col pt-0 md:pt-0 pl-0 md:pl-0">'
);

c = c.replace(
  /<div className="flex items-center justify-between mb-6 pb-2 border-b border-tech-main\/20 group\/title">/,
  '<div className="flex items-center justify-between mb-6 pb-2 pt-4 md:pt-8 pl-3 md:pl-6 border-b border-tech-main/20 group/title shrink-0">'
);

c = c.replace(
  /<div className="prose prose-base text-\[15px\] md:text-base prose-tech font-mono w-full overflow-hidden break-words \[\&>ul\]:pl-0 \[\&_ul\]:list-none \[\&_li\]:mt-1.5 \[\&_ul_ul\]:pl-3 \[\&_ul_ul\]:border-l \[\&_ul_ul\]:border-tech-main\/20 \[\&_ul_ul\]:mt-1.5 \[\&_ul_ul\]:mb-3">/,
  '<div className="overflow-y-auto flex-1 custom-left-scrollbar h-full pl-3 md:pl-6 -mt-2"><div className="prose prose-base text-[15px] md:text-base prose-tech font-mono w-full overflow-hidden break-words [&>ul]:pl-0 [&_ul]:list-none [&_li]:mt-1.5 [&_ul_ul]:pl-3 [&_ul_ul]:border-l [&_ul_ul]:border-tech-main/20 [&_ul_ul]:mt-1.5 [&_ul_ul]:mb-3 pb-8 pt-2">'
);

c = c.replace(
  /<SidebarClient content=\{sidebarContent\} \/>\s*<\/div>\s*<\/div>/,
  '<SidebarClient content={sidebarContent} />\n                </div>\n              </div>\n            </div>'
);

fs.writeFileSync('app/(dashboard)/articles/layout.tsx', c, 'utf8');
console.log('DOM updated');
