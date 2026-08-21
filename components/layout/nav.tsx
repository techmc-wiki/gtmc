"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/shadcn/sheet"

export interface NavLink {
  href: string
  label: string
}

/** Desktop nav: mono uppercase links with a signal underline on the active route. */
export function DesktopNav({ navLinks }: { navLinks: NavLink[] }) {
  const pathname = usePathname()

  return (
    <ul className="hidden items-center gap-6 md:flex">
      {navLinks.map((link) => {
        const isActive = pathname.startsWith(link.href)

        return (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`border-b-2 pb-1 font-mono text-xs tracking-[0.15em] uppercase transition-colors ${
                isActive
                  ? "border-tech-signal text-tech-main-dark font-bold"
                  : `text-tech-main hover:border-tech-main/40 hover:text-tech-main-dark border-transparent`
              } `}>
              {link.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** Mobile nav: hamburger trigger + top sheet drawer with the same links. */
export function MobileNav({ navLinks }: { navLinks: NavLink[] }) {
  const t = useTranslations("CommonA11y")
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)

  return (
    <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <SheetTrigger asChild>
        <button
          className="hover:bg-tech-main/10 flex min-h-11 min-w-11 cursor-pointer flex-col items-center justify-center gap-1.5 p-2 transition-colors md:hidden"
          aria-label={t("toggleNavigationMenu")}>
          <span
            className={`bg-tech-main h-0.5 w-5 transition-all ${isDrawerOpen ? `translate-y-2 rotate-45` : ""} `}></span>
          <span
            className={`bg-tech-main h-0.5 w-5 transition-all ${isDrawerOpen ? `opacity-0` : ""} `}></span>
          <span
            className={`bg-tech-main h-0.5 w-5 transition-all ${isDrawerOpen ? `-translate-y-2 -rotate-45` : ""} `}></span>
        </button>
      </SheetTrigger>

      <SheetContent
        side="top"
        showCloseButton={false}
        aria-label={t("toggleNavigationMenu")}
        className="border-tech-main/40 bg-surface-overlay/95 top-16 max-h-[calc(100dvh-4rem)] border-b p-0 backdrop-blur-md md:hidden">
        <div className="max-h-[calc(100dvh-4rem)] space-y-2 overflow-y-auto p-4 sm:p-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsDrawerOpen(false)}
              className="border-tech-main/40 text-tech-main-dark hover:bg-tech-main-dark hover:text-tech-bg bg-surface-overlay/60 flex min-h-11 items-center border p-3 font-mono text-xs tracking-[0.15em] uppercase transition-colors">
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher className="border-none" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
