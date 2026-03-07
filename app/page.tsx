import Link from "next/link";
import { BrutalButton } from "@/components/ui/brutal-button";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full relative overflow-y-auto overflow-x-hidden text-tech-main font-sans selection:bg-tech-main/20 selection:text-tech-main-dark">
      
      {/* ======================================================== */}
      {/* 结构层：背景图纸修饰、HUD、辅助线、标记、透视几何 */}
      {/* ======================================================== */}

      {/* 左上角系统序列号 */}
      <div className="absolute top-8 left-8 flex flex-col space-y-1 z-0">
        <div className="text-xs tracking-widest font-mono text-tech-main-dark opacity-50 uppercase">
          [ GTMC_WIKI_SYSTEM ]
        </div>
        <div className="text-[10px] tracking-widest font-mono text-tech-main opacity-30">
          BUILD.2026.03 // SECTOR-7G
        </div>
      </div>

      {/* 右上角HUD：模拟服务器/图纸数据 */}
      <div className="absolute top-8 right-12 text-[10px] font-mono text-tech-main opacity-40 text-right space-y-1 z-0 select-none hidden sm:block">
        <p>SYS.TPS   :: <span className="text-tech-main-dark font-bold">20.0 *</span></p>
        <p>JVM.HEAP  :: 16,384M / 32,768M [50%]</p>
        <p>LOAD.CHKS :: 4,201</p>
        <p>GC.TYPE   :: G1GC (12ms)</p>
        <div className="w-full h-[1px] bg-tech-main/30 my-2"></div>
        <p>COORD : X:1024 Y:64 Z:-512</p>
        <p className="mt-2 text-[8px] opacity-70">
          -XX:+UseG1GC <br/> -XX:MaxGCPauseMillis=50
        </p>
      </div>
      
      {/* Java 代码片段漂浮层 (Decompiled Source Code) */}
      <div className="absolute left-10 md:left-20 bottom-[15%] opacity-40 hidden lg:block select-none pointer-events-none transform -rotate-2 mix-blend-multiply">
        <div className="text-[11px] font-mono text-tech-main whitespace-pre leading-relaxed border-l-4 border-tech-main/40 pl-4 bg-tech-main/5 py-2">
          <span className="text-tech-main-dark font-bold">@Override</span>{"\n"}
          <span className="text-tech-main-dark font-bold">public void</span> onInitialize() {"{"}{"\n"}
          {"  "}LOGGER.info(<span className="text-tech-main-dark">"Initializing GTMC Core..."</span>);{"\n"}
          {"  "}Registry.register(Registry.ITEM, new Identifier(ID, <span className="text-tech-main-dark">"wiki_tablet"</span>),{"\n"}
          {"    "}new WikiItem(new Item.Settings().group(GROUP)));{"\n"}
          {"  "}<span className="opacity-80">{'//'} TODO: Implement packet handling for sync</span>{"\n"}
          {"}"}
        </div>
      </div>

      {/* 字节码/Hex Dump 背景层 (底层纹理) */}
      <div className="absolute top-[20%] left-[5%] text-[10px] font-mono text-tech-main opacity-[0.25] select-none pointer-events-none whitespace-pre leading-tight hidden xl:block mix-blend-multiply">
        00000000: cafe babe 0000 0034 001e 0a00 0300 0f07  .......4........{"\n"}
        00000010: 0010 0700 1101 0006 3c69 6e69 743e 0100  ........&lt;init&gt;..{"\n"}
        00000020: 0328 2956 0100 0443 6f64 6501 000f 4c69  .()V...Code...Li{"\n"}
        00000030: 6e65 4e75 6d62 6572 5461 626c 6501 0012  neNumberTable...{"\n"}
        00000040: 4c6f 6361 6c56 6172 6961 626c 6554 6162  LocalVariableTab{"\n"}
      </div>

      {/* 堆栈跟踪装饰 (Stack Trace Decor) */}
      <div className="absolute bottom-8 left-8 text-[10px] font-mono text-red-500/40 select-none pointer-events-none hidden md:block mix-blend-multiply">
        <span className="font-bold">at net.minecraft.server.MinecraftServer.run</span>(MinecraftServer.java:1) {"\n"}<br/>
        <span className="font-bold">at java.lang.Thread.run</span>(Thread.java:833) {"\n"}<br/>
        <span className="text-red-600/60 font-bold">Caused by: com.gtmc.core.ReflectiveAccesException: Blueprint not found</span>
      </div>

      {/* 分散的瞄准/坐标十字 */}
      <div className="absolute top-1/4 right-[25%] text-xl font-light opacity-30 select-none">+</div>
      <div className="absolute bottom-1/3 left-[8%] text-xl font-light opacity-30 select-none">+</div>
      <div className="absolute top-[15%] left-[45%] text-sm font-light opacity-30 select-none">+</div>
      
      {/* 巨型背景水印 (侧边倒置) */}
      <div className="absolute top-1/3 -right-20 text-[10rem] font-black text-tech-main opacity-[0.05] rotate-90 select-none pointer-events-none whitespace-nowrap hidden lg:block tracking-tighter mix-blend-multiply">
        SCHEMATIC_01
      </div>

      {/* 贯穿全图的低调主辅助线 (X轴/Y轴) */}
      <div className="absolute top-[35%] right-0 w-[40%] h-[1px] bg-tech-main/20">
        <span className="absolute -top-4 right-10 text-[10px] font-mono opacity-50">L-AXIS</span>
      </div>
      <div className="absolute top-0 left-[25%] w-[1px] h-[100%] bg-tech-main/10 flex flex-col items-center">
         {/* 轴线上的点缀 */}
         <div className="w-2 h-2 bg-tech-bg border border-tech-main/50 mt-[50vh]"></div>
      </div>

      {/* 技术图纸刻度尺 (模拟Photoshop/CAD边缘) */}
      <div className="absolute top-0 left-0 w-full h-2 border-b border-tech-main/10 flex overflow-hidden opacity-30">
        {Array.from({length: 100}).map((_,i) => (
          <div key={i} className="flex-none w-8 border-l border-tech-main/40 h-full relative">
            {i % 4 === 0 && <span className="absolute top-2 left-1 text-[8px] font-mono">{i * 10}</span>}
          </div>
        ))}
      </div>
      <div className="absolute top-0 left-0 h-full w-2 border-r border-tech-main/10 flex flex-col overflow-hidden opacity-30">
        {Array.from({length: 50}).map((_,i) => (
          <div key={i} className="flex-none h-8 border-t border-tech-main/40 w-full relative"></div>
        ))}
      </div>

      {/* MC 方块视角的几何线条叠加 (等距视角线框) */}
      <div className="absolute bottom-[20%] right-[10%] opacity-20 pointer-events-none hidden md:block">
        <svg width="200" height="200" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="0.5">
          {/* Hexagon outline (isometric cube boundary) */}
          <polygon points="60,10 110,38 110,95 60,123 10,95 10,38" />
          {/* Inner Y lines */}
          <line x1="60" y1="67" x2="60" y2="123" />
          <line x1="60" y1="67" x2="10" y2="38" />
          <line x1="60" y1="67" x2="110" y2="38" />
          {/* Dashed hidden lines */}
          <line x1="60" y1="10" x2="60" y2="67" strokeDasharray="2 2" className="opacity-50" />
          <line x1="10" y1="95" x2="60" y2="67" strokeDasharray="2 2" className="opacity-50" />
          <line x1="110" y1="95" x2="60" y2="67" strokeDasharray="2 2" className="opacity-50" />
        </svg>
        <span className="absolute bottom-4 -right-12 text-[10px] font-mono opacity-80">FIG 1. ISOMETRIC_BLOCK</span>
        {/* 指示箭头 */}
        <svg className="absolute -top-10 -left-10" width="60" height="60" fill="none" stroke="currentColor">
          <line x1="10" y1="10" x2="50" y2="50" strokeWidth="1" />
          <polygon points="50,50 40,50 50,40" fill="currentColor" />
        </svg>
      </div>

      {/* 圆形/雷达阵列结构 */}
      <div className="absolute bottom-16 left-[20%] opacity-10 pointer-events-none hidden lg:block">
        <svg width="150" height="150" viewBox="0 0 150 150" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="75" cy="75" r="60" strokeDasharray="4 4" />
          <circle cx="75" cy="75" r="40" />
          <circle cx="75" cy="75" r="10" fill="currentColor" />
          <line x1="15" y1="75" x2="135" y2="75" />
          <line x1="75" y1="15" x2="75" y2="135" />
        </svg>
      </div>

      {/* ======================================================== */}
      {/* 超大屏幕 (2K/4K/27寸) 专属扩展设计元素 - 多学科图纸 */}
      {/* ======================================================== */}
      
      {/* 红石逻辑代数/布尔运算 */}
      <div className="absolute top-[40%] right-[6%] text-[11px] font-mono text-tech-main opacity-[0.35] select-none pointer-events-none hidden 2xl:block leading-relaxed border-l border-tech-main/40 pl-4 mix-blend-multiply">
        <div className="text-tech-main-dark mb-2 font-bold">{'//'} REDSTONE_BOOLEAN_LOGIC</div>
        <span>Y = (A ∧ B) ∨ (¬C)</span><br/>
        <span>T_delay = ∑(repeater_ticks) + 1_GT</span><br/>
        <span>C_out = MUX(S, A, B)</span><br/>
        <div className="mt-2 text-[9px] opacity-80">
          * VALIDATING SIGNAL STRENGTH (0-15)<br/>
          * QUASI_CONNECTIVITY = TRUE
        </div>
      </div>

      {/* 空间坐标变换矩阵 (线性代数) */}
      <div className="absolute bottom-[30%] right-[25%] opacity-[0.35] text-[11px] font-mono select-none pointer-events-none hidden 2xl:block mix-blend-multiply">
        <div className="text-tech-main-dark mb-2 font-bold tracking-widest">TRANSFORM_MATRIX_4x4</div>
        <div className="grid grid-cols-4 gap-2 text-center border-l-2 border-r-2 border-tech-main/60 px-3 py-1 bg-tech-main/5">
          <span>1.0</span><span>0.0</span><span>0.0</span><span>dx</span>
          <span>0.0</span><span>1.0</span><span>0.0</span><span>dy</span>
          <span>0.0</span><span>0.0</span><span>1.0</span><span>dz</span>
          <span>0.0</span><span>0.0</span><span>0.0</span><span>1.0</span>
        </div>
      </div>

      {/* 内存簇/寄存器网格 */}
      <div className="absolute top-[60%] left-[3%] opacity-[0.35] text-[10px] font-mono select-none pointer-events-none hidden 2xl:block mix-blend-multiply">
        <div className="mb-2 text-tech-main-dark font-bold tracking-widest">TICK_PHASE_ALLOCATION</div>
        <div className="grid grid-cols-6 gap-x-4 gap-y-2 bg-tech-main/5 p-2 border border-tech-main/20">
          {Array.from({length: 24}).map((_, i) => (
             <span key={i} className={i % 7 === 0 ? "text-tech-main-dark font-bold relative before:content-['>'] before:absolute before:-left-3" : ""}>
               {Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0').toUpperCase()}
             </span>
          ))}
        </div>
      </div>

      {/* 力学/机械引擎图纸 (活塞结构抽象) */}
      <div className="absolute top-[15%] right-[15%] opacity-[0.25] select-none pointer-events-none hidden xl:block mix-blend-multiply">
        <svg width="140" height="160" viewBox="0 0 120 140" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="30" y="80" width="60" height="50" fill="currentColor" fillOpacity="0.15" />
          <rect x="45" y="40" width="30" height="40" strokeWidth="1.5" />
          <rect x="20" y="20" width="80" height="20" fill="currentColor" fillOpacity="0.25" strokeWidth="1.5" />
          {/* Extension line */}
          <line x1="60" y1="20" x2="60" y2="0" strokeDasharray="3 3" />
          <line x1="45" y1="0" x2="75" y2="0" />
          {/* Forces */}
          <path d="M60 90 L60 110 M55 105 L60 110 L65 105" strokeWidth="1.5" />
          <text x="70" y="110" fontSize="9" fontFamily="monospace" fill="currentColor" fontWeight="bold">F_push</text>
        </svg>
      </div>

      {/* ======================================================== */}
      {/* 核心交互区：带有微弱堆叠感和景深的卡片 */}
      {/* ======================================================== */}
      <main className="relative z-10 flex flex-col justify-center items-center w-full max-w-7xl mx-auto py-24 min-h-[max-content] px-4">
        
        {/* 数据连接线装饰 (已移除以适应居中布局) */}
        {/* <div className="absolute left-[8%] lg:left-[24%] top-[12%] h-[60%] w-[1px] border-l border-dashed border-tech-main/30"></div>
        <div className="absolute left-[8%] lg:left-[24%] top-[25%] w-[4%] h-[1px] bg-tech-main/30"></div> */}

        {/* 信息卡片主体：增加堆叠层数与框线粗细变化 */}
        <div className="relative w-full max-w-3xl mb-8 group animate-tech-pop-in [animation-duration:0.8s] [animation-delay:0.2s] opacity-0 [animation-fill-mode:forwards]">
          
          {/* 下层错位阴影框 (模拟堆叠图纸) */}
          <div className="absolute inset-0 bg-transparent border border-tech-main/20 translate-x-3 translate-y-3 -z-10 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform duration-500 ease-out"></div>
          
          {/* 尺寸标注装饰 */}
          <div className="absolute -top-6 left-0 text-[10px] font-mono opacity-0 flex items-center w-full animate-fade-in [animation-delay:1.5s] [animation-fill-mode:forwards]">
            <span>|&lt;</span>
            <span className="flex-grow border-t border-tech-main/30 mx-2"></span>
            <span>900px</span>
            <span className="flex-grow border-t border-tech-main/30 mx-2"></span>
            <span>&gt;|</span>
          </div>

          <div className="relative border border-tech-main/40 bg-white/60 backdrop-blur-md p-6 sm:p-10 md:p-14 shadow-sm overflow-hidden">
             {/* 闪光扫过效果 (Shiny Scan Line) */}
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 translate-x-[-200%] animate-[shimmer_3s_infinite_2s] pointer-events-none"></div>

            {/* 工业感/图纸感的定位刻度 */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-tech-main -translate-x-[2px] -translate-y-[2px]"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-tech-main translate-x-[2px] translate-y-[2px]"></div>
            
            {/* 钉子/打孔装饰 */}
            <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full border border-tech-main/50 bg-tech-bg/50"></div>
            <div className="absolute bottom-4 left-4 w-1.5 h-1.5 rounded-full border border-tech-main/50 bg-tech-bg/50"></div>

            <div className="flex items-center space-x-4 mb-6 opacity-0 animate-fade-in [animation-delay:0.8s] [animation-fill-mode:forwards]">
              {/* 正体方块元素隐喻 MC */}
              <div className="w-10 h-10 bg-tech-main/5 flex items-center justify-center border border-tech-main/40 relative group-hover:rotate-90 transition-transform duration-500">
                <div className="w-4 h-4 bg-tech-main/30 group-hover:bg-tech-main/60 transition-colors"></div>
              </div>
              <h2 className="text-sm font-mono tracking-[0.3em] text-tech-main/80 uppercase">
                Knowledge Base_
              </h2>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-tech-main-dark mb-6 relative overflow-hidden">
              <span className="inline-block animate-tech-slide-in [animation-delay:0.5s] opacity-0 [animation-fill-mode:forwards]">GTMC</span> 
              <span className="inline-block opacity-0 font-light mix-blend-multiply text-tech-main animate-tech-slide-in [animation-delay:0.7s] [animation-fill-mode:forwards] ml-4">Wiki</span>
              {/* 阅读头光标闪烁动画 */}
              <span className="inline-block w-6 h-[1em] bg-tech-main opacity-0 ml-2 animate-pulse align-middle [animation-delay:1s] [animation-fill-mode:forwards]"></span>
            </h1>
            
            <p className="text-base md:text-lg text-tech-main-dark/80 tracking-wide max-w-xl leading-relaxed border-l-[3px] border-tech-main/40 pl-5 opacity-0 animate-fade-in [animation-delay:1.2s] [animation-translate-y:20px] [animation-duration:1s] [animation-fill-mode:forwards]">
              支持多人协作、内容审核与 Git 自动备份的 MC 资源与知识整合站点。
              <span className="text-[11px] font-mono mt-4 flex items-center opacity-60 tracking-[0.2em]">
                <span className="w-2 h-2 rounded-full bg-tech-main mr-2 animate-pulse"></span>
                &gt;&gt; MODPACKS | MECHANICS | TUTORIALS
              </span>
            </p>
          </div>
        </div>
        
        {/* 操作入口 */}
        <div className="flex flex-wrap justify-center gap-5 relative z-20 w-full opacity-0 animate-slide-up-fade [animation-delay:1.4s] [animation-fill-mode:forwards]">
          <Link href="/articles">
             <BrutalButton variant="primary" className="uppercase text-sm tracking-[0.1em] px-8 py-3 w-full sm:w-auto h-12 flex items-center justify-center hover:scale-105 transition-transform active:scale-95 duration-200 shadow-md">
               ACCESS DATABASE →
             </BrutalButton>
          </Link>
          <Link href="/login">
            <BrutalButton variant="ghost" className="uppercase text-sm tracking-[0.1em] px-8 py-3 w-full sm:w-auto h-12 flex items-center justify-center text-tech-main-dark font-medium border border-tech-main/40 hover:border-tech-main bg-white/70 backdrop-blur-md hover:bg-white shadow-sm transition-all duration-300">
              /{'/'} INITIALIZE LOGIN
            </BrutalButton>
          </Link>
        </div>

        {/* 底部隐喻：MC典型的格子/合成槽堆叠图形列阵 */}
        <div className="mt-12 flex space-x-1 opacity-40 pointer-events-none relative">
          <div className="absolute -top-4 text-[8px] font-mono text-tech-main/60">INVENTORY_SLOTS_</div>
          {[...Array(9)].map((_, i) => (
            <div key={i} className={`w-8 h-8 flex items-center justify-center ${i === 3 ? 'border-2 border-tech-main-dark bg-tech-main/10 shadow-[0_0_8px_rgba(96,112,143,0.3)]' : 'border border-tech-main/40'}`}>
              {/* 给某个格子放一个小方块隐喻正在持有的物品 */}
              {i === 3 && <div className="w-4 h-4 bg-tech-main-dark/80 rotate-45"></div>}
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
