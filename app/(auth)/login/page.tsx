// 后现代技术风登录页
"use client";

import { signIn } from "next-auth/react";
import { BrutalButton } from "@/components/ui/brutal-button";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    await signIn("github", { callbackUrl: "/draft" }); 
  };

  return (
    <div className="flex min-h-screen w-full relative overflow-hidden text-tech-main font-sans selection:bg-tech-main/20 selection:text-tech-main-dark">
      
      {/* ======================================================== */}
      {/* 结构层：背景图纸修饰、HUD、辅助线、标记、透视几何 */}
      {/* ======================================================== */}

      {/* 左上角系统序列号 */}
      <div className="absolute top-8 left-8 flex flex-col space-y-1 z-0">
        <div className="text-xs tracking-widest font-mono text-tech-main-dark opacity-50 uppercase">
          [ GTMC_AUTH_GATEWAY ]
        </div>
        <div className="text-[10px] tracking-widest font-mono text-tech-main opacity-30">
          SECURE.CONN // PORT-443
        </div>
      </div>

      {/* 右上角HUD：模拟服务器/图纸数据 */}
      <div className="absolute top-8 right-12 text-[10px] font-mono text-tech-main opacity-40 text-right space-y-1 z-0 select-none hidden sm:block">
        <p>STATUS    :: <span className="text-red-500 font-bold">LOCKED *</span></p>
        <p>ENCRYPTION:: AES-256-GCM</p>
        <p>HANDSHAKE :: WAITING...</p>
        <div className="w-full h-[1px] bg-tech-main/30 my-2"></div>
        <p>SESSION : NULL</p>
      </div>

      {/* Java 代码片段漂浮层 (Decompiled Source Code) */}
      <div className="absolute right-10 md:right-20 bottom-[20%] opacity-20 hidden lg:block select-none pointer-events-none transform rotate-2">
        <div className="text-[10px] font-mono text-tech-main whitespace-pre leading-relaxed border-r-2 border-tech-main/20 pr-4 text-right">
          <span className="text-tech-main-dark font-bold">@PostMapping</span>(<span className="text-tech-main-dark">"/login"</span>){"\n"}
          <span className="text-tech-main-dark">public</span> ResponseEntity&lt;?&gt; authenticate(Request req) {"{"}{"\n"}
          {"  "}SecurityContext ctx = Security.getContext();{"\n"}
          {"  "}if (!ctx.isAuthenticated()) throw new AuthException();{"\n"}
          {"  "}return ResponseEntity.ok(token);{"\n"}
          {"}"}
        </div>
      </div>

      {/* 贯穿全图的低调主辅助线 */}
      <div className="absolute top-[50%] left-0 w-full h-[1px] bg-tech-main/10 flex items-center justify-center">
         <div className="w-2 h-2 bg-tech-bg border border-tech-main/50"></div>
      </div>
      <div className="absolute top-0 left-[50%] w-[1px] h-full bg-tech-main/10"></div>

      {/* 巨型背景水印 */}
      <div className="absolute bottom-0 -left-20 text-[8rem] font-black text-tech-main opacity-[0.03] select-none pointer-events-none whitespace-nowrap hidden lg:block tracking-tighter">
        ACCESS_CONTROL
      </div>

      {/* ======================================================== */}
      {/* 核心交互区 */}
      {/* ======================================================== */}
      <main className="relative z-10 flex flex-col justify-center items-center w-full px-4 md:px-0 max-w-lg mx-auto">
        
        {/* 信息卡片主体 */}
        <div className="relative w-full mb-8 group animate-tech-pop-in [animation-duration:0.8s] [animation-delay:0.2s] opacity-0 [animation-fill-mode:forwards]">
          
          {/* 下层错位阴影框 */}
          <div className="absolute inset-0 bg-transparent border border-tech-main/20 translate-x-2 translate-y-2 md:translate-x-3 md:translate-y-3 -z-10 group-hover:translate-x-3 group-hover:translate-y-3 md:group-hover:translate-x-4 md:group-hover:translate-y-4 transition-transform duration-500 ease-out"></div>
          
           {/* 尺寸标注 decoration */}
           <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-[10px] font-mono opacity-0 flex-col items-center h-full animate-fade-in [animation-delay:1.5s] [animation-fill-mode:forwards] hidden sm:flex">
            <span className="block border-l border-tech-main/30 h-10 w-[1px]"></span>
            <span className="py-2 rotate-90 whitespace-nowrap">SECURE FORM</span>
            <span className="block border-l border-tech-main/30 h-10 w-[1px]"></span>
          </div>

          <div className="relative border border-tech-main/40 bg-white/60 backdrop-blur-md p-6 md:p-10 shadow-sm overflow-hidden text-center">
             {/* 闪光扫过效果 */}
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 translate-x-[-200%] animate-[shimmer_3s_infinite_2s] pointer-events-none"></div>

            {/* 角落刻度 */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-tech-main -translate-x-[2px] -translate-y-[2px]"></div>
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-tech-main translate-x-[2px] -translate-y-[2px]"></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-tech-main -translate-x-[2px] translate-y-[2px]"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-tech-main translate-x-[2px] translate-y-[2px]"></div>

            <div className="flex flex-col items-center mb-8">
              <div className="w-12 h-12 bg-tech-main/5 flex items-center justify-center border border-tech-main/40 mb-4 animate-tech-pop-in [animation-delay:0.6s] opacity-0 [animation-fill-mode:forwards]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-tech-main-dark">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-tech-main-dark relative overflow-hidden">
                <span className="inline-block animate-tech-slide-in [animation-delay:0.7s] opacity-0 [animation-fill-mode:forwards]">IDENTITY</span>
                <span className="inline-block animate-tech-slide-in [animation-delay:0.9s] opacity-0 [animation-fill-mode:forwards] ml-2 text-tech-main font-light">VERIFICATION</span>
              </h1>
            </div>
            
            <p className="text-sm text-tech-main-dark/70 mb-8 max-w-xs mx-auto opacity-0 animate-fade-in [animation-delay:1.1s] [animation-fill-mode:forwards]">
              Please authenticate with your GitHub account to access the restricted database.
            </p>

            <div className="w-full opacity-0 animate-slide-up-fade [animation-delay:1.3s] [animation-fill-mode:forwards]">
              <BrutalButton 
                onClick={handleLogin}
                disabled={isLoading}
                variant="primary" 
                className="w-full uppercase text-sm tracking-[0.1em] h-12 flex items-center justify-center hover:scale-[1.02] transition-transform active:scale-[0.98] duration-200"
              >
                {isLoading ? (
                   <span className="flex items-center">
                     <span className="w-2 h-2 bg-white/50 rounded-full mr-2 animate-ping"></span>
                     CONNECTING...
                   </span>
                ) : "INITIATE GITHUB OAUTH →"}
              </BrutalButton>
            </div>
            
            <div className="mt-6 text-[10px] font-mono opacity-40 animate-fade-in [animation-delay:1.6s] [animation-fill-mode:forwards]">
              <p>PROTECTED BY GTMC_SECURE_GATEWAY v2.0</p>
              <Link href="/" className="hover:text-tech-main-dark decoration-dashed underline underline-offset-4 mt-2 inline-block transition-colors">
                &lt; RETURN TO PUBLIC ACCESS
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}