// 后现代技术风登录页
"use client"

import { signIn } from "next-auth/react"
import { BrutalButton } from "@/components/ui/brutal-button"
import { useState } from "react"
import Link from "next/link"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    await signIn("github", { callbackUrl: "/draft" })
  }

  return (
    <div className="
      relative flex min-h-screen w-full overflow-hidden font-sans text-tech-main
      selection:bg-tech-main/20 selection:text-tech-main-dark
    ">
      {/* ======================================================== */}
      {/* 结构层：背景图纸修饰、HUD、辅助线、标记、透视几何 */}
      {/* ======================================================== */}

      {/* 左上角系统序列号 */}
      <div className="
        absolute top-8 left-8 z-0 flex hidden flex-col space-y-1
        md:flex
      ">
        <div className="
          font-mono text-xs tracking-widest text-tech-main-dark uppercase
          opacity-50
        ">
          [ GTMC_AUTH_GATEWAY ]
        </div>
        <div className="
          font-mono text-[10px] tracking-widest text-tech-main opacity-30
        ">
          SECURE.CONN // PORT-443
        </div>
      </div>

      {/* 右上角HUD：模拟服务器/图纸数据 */}
      <div className="
        absolute top-8 right-12 z-0 hidden space-y-1 text-right font-mono
        text-[10px] text-tech-main opacity-40 select-none
        sm:block
      ">
        <p>
          STATUS ::{" "}
          <span className="font-bold text-red-500">LOCKED *</span>
        </p>
        <p>ENCRYPTION:: AES-256-GCM</p>
        <p>HANDSHAKE :: WAITING...</p>
        <div className="my-2 h-px w-full bg-tech-main/30"></div>
        <p>SESSION : NULL</p>
      </div>

      {/* Java 代码片段漂浮层 (Decompiled Source Code) */}
      <div className="
        decor-desktop-only pointer-events-none absolute right-10 bottom-[20%]
        hidden rotate-2 opacity-20 select-none
        md:right-20
        lg:block
      ">
        <div className="
          border-r-2 border-tech-main/20 pr-4 text-right font-mono text-[10px]
          leading-relaxed whitespace-pre text-tech-main
        ">
          <span className="font-bold text-tech-main-dark">
            @PostMapping
          </span>
          (
          <span className="text-tech-main-dark">
            &quot;/login&quot;
          </span>
          ){"\n"}
          <span className="text-tech-main-dark">public</span>{" "}
          ResponseEntity&lt;?&gt; authenticate(Request req) {"{"}
          {"\n"}
          {"  "}SecurityContext ctx = Security.getContext();{"\n"}
          {"  "}if (!ctx.isAuthenticated()) throw new AuthException();
          {"\n"}
          {"  "}return ResponseEntity.ok(token);{"\n"}
          {"}"}
        </div>
      </div>

      {/* 贯穿全图的低调主辅助线 */}
      <div className="
        decor-desktop-only absolute top-[50%] left-0 flex hidden h-px w-full
        items-center justify-center bg-tech-main/10
        md:flex
      ">
        <div className="size-2 border border-tech-main/50 bg-tech-bg"></div>
      </div>
      <div className="
        w-pxfull decor-desktop-only absolute top-0 left-[50%] hidden
        bg-tech-main/10
        md:block
      "></div>

      {/* 巨型背景水印 */}
      <div className="
        decor-desktop-only pointer-events-none absolute bottom-0 -left-20 hidden
        text-[8rem] font-black tracking-tighter whitespace-nowrap text-tech-main
        opacity-[0.03] select-none
        lg:block
      ">
        ACCESS_CONTROL
      </div>

      {/* ======================================================== */}
      {/* 核心交互区 */}
      {/* ======================================================== */}
      <main className="
        relative z-10 mx-auto flex w-full max-w-lg flex-col items-center
        justify-center px-4
        md:px-0
      ">
        {/* 信息卡片主体 */}
        <div className="
          group relative mb-8 w-full animate-tech-pop-in opacity-0
          [animation-delay:0.2s] [animation-duration:0.8s]
          [animation-fill-mode:forwards]
        ">
          {/* 下层错位阴影框 */}
          <div className="
            absolute inset-0 -z-10 translate-2 border border-tech-main/20
            bg-transparent transition-transform duration-500 ease-out
            group-hover:translate-3
            md:translate-3
            md:group-hover:translate-4
          "></div>

          {/* 尺寸标注 decoration */}
          <div className="
            absolute top-1/2 -right-6 hidden h-full -translate-y-1/2
            animate-fade-in flex-col items-center font-mono text-[10px]
            opacity-0 [animation-delay:1.5s] [animation-fill-mode:forwards]
            sm:flex
          ">
            <span className="block h-10 w-px border-l border-tech-main/30"></span>
            <span className="rotate-90 py-2 whitespace-nowrap">
              SECURE FORM
            </span>
            <span className="block h-10 w-px border-l border-tech-main/30"></span>
          </div>

          <div className="
            relative overflow-hidden border border-tech-main/40 bg-white/60 p-6
            text-center shadow-sm backdrop-blur-md
            md:p-10
          ">
            {/* 闪光扫过效果 */}
            <div className="
              pointer-events-none absolute inset-0 translate-x-[-200%]
              -skew-x-12 animate-[shimmer_3s_infinite_2s] bg-linear-to-r
              from-transparent via-white/40 to-transparent
            "></div>

            {/* 角落刻度 */}
            <div className="
              absolute top-0 left-0 size-3 -translate-0.5 border-t-2 border-l-2
              border-tech-main
            "></div>
            <div className="
              absolute top-0 right-0 size-3 translate-x-0.5 -translate-y-0.5
              border-t-2 border-r-2 border-tech-main
            "></div>
            <div className="
              absolute bottom-0 left-0 size-3 -translate-x-0.5 translate-y-0.5
              border-b-2 border-l-2 border-tech-main
            "></div>
            <div className="
              absolute right-0 bottom-0 size-3 translate-0.5 border-r-2
              border-b-2 border-tech-main
            "></div>

            <div className="mb-8 flex flex-col items-center">
              <div className="
                mb-4 flex size-12 animate-tech-pop-in items-center
                justify-center border border-tech-main/40 bg-tech-main/5
                opacity-0 [animation-delay:0.6s] [animation-fill-mode:forwards]
              ">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-tech-main-dark">
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h1 className="
                relative overflow-hidden text-3xl font-bold tracking-tight
                text-tech-main-dark
              ">
                <span className="
                  inline-block animate-tech-slide-in opacity-0
                  [animation-delay:0.7s] [animation-fill-mode:forwards]
                ">
                  IDENTITY
                </span>
                <span className="
                  ml-2 inline-block animate-tech-slide-in font-light
                  text-tech-main opacity-0 [animation-delay:0.9s]
                  [animation-fill-mode:forwards]
                ">
                  VERIFICATION
                </span>
              </h1>
            </div>

            <p className="
              mx-auto mb-8 max-w-xs animate-fade-in text-sm
              text-tech-main-dark/70 opacity-0 [animation-delay:1.1s]
              [animation-fill-mode:forwards]
            ">
              Please authenticate with your GitHub account to access
              the restricted database.
            </p>

            <div className="
              w-full animate-slide-up-fade opacity-0 [animation-delay:1.3s]
              [animation-fill-mode:forwards]
            ">
              <BrutalButton
                onClick={handleLogin}
                disabled={isLoading}
                variant="primary"
                className="
                  flex h-12 w-full items-center justify-center text-sm
                  tracking-widest uppercase transition-transform duration-300
                  hover:scale-[1.02]
                  active:scale-[0.98]
                ">
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="
                      mr-2 size-2 animate-ping rounded-full bg-white/50
                    "></span>
                    CONNECTING...
                  </span>
                ) : (
                  "INITIATE GITHUB OAUTH →"
                )}
              </BrutalButton>
            </div>

            <div className="
              mt-6 animate-fade-in font-mono text-[10px] opacity-40
              [animation-delay:1.6s] [animation-fill-mode:forwards]
            ">
              <p>PROTECTED BY GTMC_SECURE_GATEWAY v2.0</p>
              <Link
                href="/"
                className="
                  mt-2 inline-block underline decoration-dashed
                  underline-offset-4 transition-colors
                  hover:text-tech-main-dark
                ">
                &lt; RETURN TO PUBLIC ACCESS
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
