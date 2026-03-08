const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');
const searchSection = code.match(/<h1[\s\S]*?<\/h1>/)[0];

const newH1 = `            <h1 className="flex items-center text-6xl md:text-7xl font-bold tracking-tight text-tech-main-dark mb-6 relative overflow-hidden">
              <span className="inline-block animate-tech-slide-in [animation-delay:0.5s] opacity-0 [animation-fill-mode:forwards] mr-6">
                <Logo size="2xl" showSlash={false} className="pointer-events-none" />
              </span>
              <span className="inline-block opacity-0 font-light mix-blend-multiply text-tech-main animate-tech-slide-in [animation-delay:0.7s] [animation-fill-mode:forwards]">Wiki</span>
              {/* 阅读头光标闪烁动画 */}
              <span className="inline-block w-6 h-[1em] bg-tech-main opacity-0 ml-4 animate-pulse align-middle [animation-delay:1s] [animation-fill-mode:forwards]"></span>
            </h1>`;

code = code.replace(searchSection, newH1);
fs.writeFileSync('app/page.tsx', code);
console.log('Fixed!');
