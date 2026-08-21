// 后现代技术风登录页
"use client"

import { signIn } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/shadcn/button"
import { useState } from "react"
import { Link } from "@/i18n/navigation"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const t = useTranslations("Auth")

  const handleLogin = async () => {
    setIsLoading(true)
    const callbackUrl =
      new URLSearchParams(window.location.search).get("callbackUrl") || "/draft"
    await signIn("github", { callbackUrl })
  }

  return (
    <div className="text-tech-main selection:bg-tech-main/20 selection:text-tech-main-dark relative flex min-h-screen w-full overflow-hidden font-sans">
      {/* ======================================================== */}
      {/* 核心交互区 */}
      {/* ======================================================== */}
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center justify-center px-4 md:px-0">
        {/* 信息卡片主体 */}
        <div className="group animate-tech-pop-in fill-mode-forwards relative mb-8 w-full opacity-0 [animation-delay:0.2s] [animation-duration:0.8s] motion-reduce:animate-none motion-reduce:opacity-100">
          <div className="border-tech-main/40 bg-surface-overlay/60 relative overflow-hidden border p-6 text-center shadow-sm backdrop-blur-md md:p-10">
            <div className="mb-8 flex flex-col items-center">
              <div className="animate-tech-pop-in border-tech-main/40 bg-tech-main/5 fill-mode-forwards mb-4 flex size-12 items-center justify-center border opacity-0 [animation-delay:0.6s] motion-reduce:animate-none motion-reduce:opacity-100">
                <svg
                  aria-hidden="true"
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
              <h1 className="animate-tech-slide-in display-title text-tech-main-dark fill-mode-forwards relative inline-block overflow-hidden text-3xl tracking-tight opacity-0 [animation-delay:0.7s] motion-reduce:animate-none motion-reduce:opacity-100">
                {t("heading")}
              </h1>
            </div>

            <p className="animate-fade-in text-tech-main-dark/70 fill-mode-forwards mx-auto mb-8 max-w-xs text-sm opacity-0 [animation-delay:1.1s] motion-reduce:animate-none motion-reduce:opacity-100">
              {t("description")}
            </p>

            <div className="animate-slide-up-fade fill-mode-forwards w-full opacity-0 [animation-delay:1.3s] motion-reduce:animate-none motion-reduce:opacity-100">
              <Button
                onClick={handleLogin}
                disabled={isLoading}
                variant="primary"
                className="flex h-12 w-full items-center justify-center transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]">
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="bg-surface/50 mr-2 size-2 animate-ping rounded-full motion-reduce:animate-none"></span>
                    {t("connectingLabel")}
                  </span>
                ) : (
                  t("loginCta")
                )}
              </Button>
            </div>

            <div className="animate-fade-in fill-mode-forwards mt-6 text-xs opacity-60 [animation-delay:1.6s] motion-reduce:animate-none">
              <Link
                href="/"
                className="hover:text-tech-main-dark mt-2 inline-block underline decoration-dashed underline-offset-4 transition-colors">
                {t("returnLink")}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
