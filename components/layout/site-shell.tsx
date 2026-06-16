import * as React from "react"
import { useTranslations } from "next-intl"
import { PageTransition } from "./page-transition"

interface SiteShellProps {
  leftSlot: React.ReactNode
  rightSlot: React.ReactNode
  children: React.ReactNode
  fullBleed?: boolean
}

export function SiteShell({
  leftSlot,
  rightSlot,
  children,
  fullBleed = false,
}: SiteShellProps) {
  const t = useTranslations("CommonA11y")

  return (
    <div className="text-tech-main selection:bg-tech-main/20 selection:text-tech-main-dark relative min-h-screen w-full font-sans">
      <a
        href="#main-content"
        className="focus:bg-surface-overlay focus:border-tech-main focus:text-tech-main-dark sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:border focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:outline-none">
        {t("skipToMainContent")}
      </a>
      <nav
        aria-label={t("mainNavigation")}
        className="border-tech-main/30 bg-surface-overlay/85 fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md">
        <div className="bg-tech-signal absolute top-0 left-0 h-[3px] w-full" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between md:h-20">
            <div className="flex space-x-4 md:space-x-8">{leftSlot}</div>

            <div className="flex items-center gap-4">{rightSlot}</div>
          </div>
        </div>
      </nav>

      <div className="flex min-h-screen w-full flex-col overflow-x-clip">
        <div className="h-16 shrink-0 md:h-20" aria-hidden="true" />

        <main
          id="main-content"
          className={`relative flex w-full flex-1 flex-col ${
            fullBleed ? "" : "p-4 sm:p-6 lg:px-12 lg:py-8"
          }`}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}
