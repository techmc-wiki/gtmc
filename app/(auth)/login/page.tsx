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
    <div className="text-tech-main selection:bg-tech-main/20 selection:text-tech-main-dark relative flex min-h-screen w-full overflow-hidden font-sans">
      {/* ======================================================== */}
      {/* 结构层：背景图纸修饰、HUD、辅助线、标记、透视几何 */}
      {/* ======================================================== */}

      {/* 左上角系统序列号 */}
      <div className="absolute top-8 left-8 z-0 flex hidden flex-col space-y-1 md:flex">
        <div className="text-tech-main-dark font-mono text-xs tracking-widest uppercase opacity-50">
          [ GTMC_AUTH_GATEWAY ]
        </div>
        <div className="text-tech-main font-mono text-[10px] tracking-widest opacity-30">
          SECURE.CONN // PORT-443
        </div>
      </div>

      {/* 右上角HUD：模拟服务器/图纸数据 */}
      <div className="text-tech-main absolute top-8 right-12 z-0 hidden space-y-1 text-right font-mono text-[10px] opacity-40 select-none sm:block">
        <p>
          STATUS :: <span className="font-bold text-red-500">LOCKED *</span>
        </p>
        <p>ENCRYPTION:: AES-256-GCM</p>
        <p>HANDSHAKE :: WAITING...</p>
        <div className="bg-tech-main/30 my-2 h-px w-full"></div>
        <p>SESSION : NULL</p>
      </div>

      {/* Java 代码片段漂浮层 (Decompiled Source Code) */}
      <div className="decor-desktop-only pointer-events-none absolute right-10 bottom-[20%] hidden rotate-2 opacity-20 select-none md:right-20 lg:block">
        <div className="text-tech-main border-tech-main/20 border-r-2 pr-4 text-right font-mono text-[10px] leading-relaxed whitespace-pre">
          <span className="text-tech-main-dark font-bold">@PostMapping</span>(
          <span className="text-tech-main-dark">&quot;/login&quot;</span>){"\n"}
          <span className="text-tech-main-dark">public</span> ResponseEntity&lt;?&gt;
          authenticate(Request req) {"{"}
          {"\n"}
          {"  "}SecurityContext ctx = Security.getContext();{"\n"}
          {"  "}if (!ctx.isAuthenticated()) throw new AuthException();{"\n"}
          {"  "}return ResponseEntity.ok(token);{"\n"}
          {"}"}
        </div>
      </div>

      {/* 贯穿全图的低调主辅助线 */}
      <div className="bg-tech-main/10 decor-desktop-only absolute top-[50%] left-0 flex hidden h-px w-full items-center justify-center md:flex">
        <div className="bg-tech-bg border-tech-main/50 h-2 w-2 border"></div>
      </div>
      <div className="w-pxfull bg-tech-main/10 decor-desktop-only absolute top-0 left-[50%] hidden md:block"></div>

      {/* 巨型背景水印 */}
      <div className="text-tech-main decor-desktop-only pointer-events-none absolute bottom-0 -left-20 hidden text-[8rem] font-black tracking-tighter whitespace-nowrap opacity-[0.03] select-none lg:block">
        ACCESS_CONTROL
      </div>

      {/* ======================================================== */}
      {/* 核心交互区 */}
      {/* ======================================================== */}
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center justify-center px-4 md:px-0">
        {/* 信息卡片主体 */}
        <div className="group animate-tech-pop-in relative mb-8 w-full opacity-0 [animation-delay:0.2s] [animation-duration:0.8s] [animation-fill-mode:forwards]">
          {/* 下层错位阴影框 */}
          <div className="border-tech-main/20 absolute inset-0 -z-10 translate-x-2 translate-y-2 border bg-transparent transition-transform duration-500 ease-out group-hover:translate-x-3 group-hover:translate-y-3 md:translate-x-3 md:translate-y-3 md:group-hover:translate-x-4 md:group-hover:translate-y-4"></div>

          {/* 尺寸标注 decoration */}
          <div className="animate-fade-in absolute top-1/2 -right-6 hidden h-full -translate-y-1/2 flex-col items-center font-mono text-[10px] opacity-0 [animation-delay:1.5s] [animation-fill-mode:forwards] sm:flex">
            <span className="border-tech-main/30 block h-10 w-px border-l"></span>
            <span className="rotate-90 py-2 whitespace-nowrap">SECURE FORM</span>
            <span className="border-tech-main/30 block h-10 w-px border-l"></span>
          </div>

          <div className="border-tech-main/40 relative overflow-hidden border bg-white/60 p-6 text-center shadow-sm backdrop-blur-md md:p-10">
            {/* 闪光扫过效果 */}
            <div className="pointer-events-none absolute inset-0 translate-x-[-200%] -skew-x-12 animate-[shimmer_3s_infinite_2s] bg-linear-to-r from-transparent via-white/40 to-transparent"></div>

            {/* 角落刻度 */}
            <div className="border-tech-main absolute top-0 left-0 h-3 w-3 -translate-x-0.5 -translate-y-0.5 border-t-2 border-l-2"></div>
            <div className="border-tech-main absolute top-0 right-0 h-3 w-3 translate-x-0.5 -translate-y-0.5 border-t-2 border-r-2"></div>
            <div className="border-tech-main absolute bottom-0 left-0 h-3 w-3 -translate-x-0.5 translate-y-0.5 border-b-2 border-l-2"></div>
            <div className="border-tech-main absolute right-0 bottom-0 h-3 w-3 translate-x-0.5 translate-y-0.5 border-r-2 border-b-2"></div>

            <div className="mb-8 flex flex-col items-center">
              <div className="bg-tech-main/5 border-tech-main/40 animate-tech-pop-in mb-4 flex h-12 w-12 items-center justify-center border opacity-0 [animation-delay:0.6s] [animation-fill-mode:forwards]">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-tech-main-dark"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h1 className="text-tech-main-dark relative overflow-hidden text-3xl font-bold tracking-tight">
                <span className="animate-tech-slide-in inline-block opacity-0 [animation-delay:0.7s] [animation-fill-mode:forwards]">
                  IDENTITY
                </span>
                <span className="animate-tech-slide-in text-tech-main ml-2 inline-block font-light opacity-0 [animation-delay:0.9s] [animation-fill-mode:forwards]">
                  VERIFICATION
                </span>
              </h1>
            </div>

            <p className="text-tech-main-dark/70 animate-fade-in mx-auto mb-8 max-w-xs text-sm opacity-0 [animation-delay:1.1s] [animation-fill-mode:forwards]">
              Please authenticate with your GitHub account to access the restricted database.
            </p>

            <div className="animate-slide-up-fade w-full opacity-0 [animation-delay:1.3s] [animation-fill-mode:forwards]">
              <BrutalButton
                onClick={handleLogin}
                disabled={isLoading}
                variant="primary"
                className="flex h-12 w-full items-center justify-center text-sm tracking-widest uppercase transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="mr-2 h-2 w-2 animate-ping rounded-full bg-white/50"></span>
                    CONNECTING...
                  </span>
                ) : (
                  "INITIATE GITHUB OAUTH →"
                )}
              </BrutalButton>
            </div>

            <div className="animate-fade-in mt-6 font-mono text-[10px] opacity-40 [animation-delay:1.6s] [animation-fill-mode:forwards]">
              <p>PROTECTED BY GTMC_SECURE_GATEWAY v2.0</p>
              <Link
                href="/"
                className="hover:text-tech-main-dark mt-2 inline-block underline decoration-dashed underline-offset-4 transition-colors"
              >
                &lt; RETURN TO PUBLIC ACCESS
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
