const fs = require('fs');
let c = fs.readFileSync('app/(dashboard)/articles/layout.tsx', 'utf8');

const regex = /className="sticky top-\[80px\] sm:top-\[104px\] lg:top-\[112px\] hover:z-20 h-\[calc\(100vh-80px\)\] sm:h-\[calc\(100vh-104px\)\] lg:h-\[calc\(100vh-112px\)\] flex flex-col"/;

const replacement = 'className="sticky top-[80px] sm:top-[104px] lg:top-[112px] hover:z-20 h-[calc(100vh-96px)] sm:h-[calc(100vh-128px)] lg:h-[calc(100vh-144px)] flex flex-col"';

if (regex.test(c)) {
  c = c.replace(regex, replacement);
  fs.writeFileSync('app/(dashboard)/articles/layout.tsx', c, 'utf8');
  console.log("Successfully replaced class for perfect sticky height.");
} else {
  console.log("Class not found!");
}
