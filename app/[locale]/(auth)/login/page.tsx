"use client"

import { signIn } from "next-auth/react"
import { useTranslations } from "next-intl"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/shadcn/button"
import { GithubIcon } from "@/components/ui/icons"
import { useState } from "react"
import { Link } from "@/i18n/navigation"

function sanitizeCallbackUrl(raw: string | null): string {
  if (!raw) return "/draft"
  try {
    const parsed = new URL(raw, window.location.origin)
    if (parsed.origin === window.location.origin) {
      return parsed.pathname + parsed.search + parsed.hash
    }
  } catch {}
  return "/draft"
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const t = useTranslations("Auth")

  const handleLogin = async () => {
    setIsLoading(true)
    const callbackUrl = sanitizeCallbackUrl(
      new URLSearchParams(window.location.search).get("callbackUrl")
    )
    await signIn("github", { callbackUrl })
  }

  return (
    <div className="text-tech-main selection:bg-tech-main/20 selection:text-tech-main-dark relative flex min-h-screen w-full overflow-hidden font-sans">
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center justify-center px-4 md:px-0">
        <div className="group relative mb-8 w-full">
          <div className="border-tech-main/40 bg-surface-overlay/60 t-stagger is-shown relative overflow-hidden border p-6 text-center shadow-sm backdrop-blur-md md:p-10">
            <div className="mb-8 flex flex-col items-center">
              <div className="border-tech-main/40 bg-tech-main/5 mb-4 flex size-12 items-center justify-center border">
                <svg
                  aria-hidden="true"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
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
              <h1 className="display-title text-tech-main-dark t-stagger-line relative text-3xl tracking-tight">
                {t("heading")}
              </h1>
            </div>

            <p className="text-tech-main-dark/70 t-stagger-line t-stagger-line--2 mx-auto mb-8 max-w-xs text-sm">
              {t("description")}
            </p>

            <div className="w-full">
              <Button
                onClick={handleLogin}
                disabled={isLoading}
                className="flex h-12 w-full items-center justify-center transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]">
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="bg-surface/50 mr-2 size-2 animate-ping rounded-full motion-reduce:animate-none"></span>
                    {t("connectingLabel")}
                  </span>
                ) : (
                  <>
                    <GithubIcon className="size-4" />
                    {t("loginCta")}
                  </>
                )}
              </Button>
            </div>

            <div className="mt-6 text-xs opacity-60">
              <Link
                href="/"
                className="hover:text-tech-main-dark mt-2 inline-flex items-center gap-1.5 underline decoration-dashed underline-offset-4 transition-colors">
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                {t("returnLink")}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
