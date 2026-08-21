"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { Logo } from "@/components/ui/logo"
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

/**
 * Mobile nav: hamburger trigger + modal side drawer (research default over
 * top dropdowns — preserves page context via the scrim and gives the IA room).
 * Radix Dialog supplies the modal semantics: focus trap, Escape, focus return.
 */
export function MobileNav({ navLinks }: { navLinks: NavLink[] }) {
  const t = useTranslations("CommonA11y")
  const tFooter = useTranslations("Footer")
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
        side="left"
        showCloseButton={false}
        aria-label={t("toggleNavigationMenu")}
        aria-describedby={undefined}
        className="border-tech-main/40 bg-surface-overlay/95 w-[85vw] max-w-xs border-r p-0 backdrop-blur-md md:hidden">
        <div className="flex h-full flex-col">
          <div className="border-tech-main/30 flex h-16 shrink-0 items-center justify-between border-b px-4">
            <Logo size="sm" />
          </div>
          <nav
            aria-label={t("toggleNavigationMenu")}
            className="flex-1 overflow-y-auto p-3">
            <p className="text-tech-main/50 mb-2 px-1 font-mono text-[0.625rem] tracking-[0.2em] uppercase">
              {tFooter("sectionRead")}
            </p>
            <ul className="space-y-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsDrawerOpen(false)}
                    className="border-tech-main/40 text-tech-main-dark hover:border-tech-signal hover:bg-tech-main/5 flex min-h-11 items-center border-b px-3 font-mono text-xs tracking-[0.15em] uppercase transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-tech-main/30 flex shrink-0 items-center gap-2 border-t p-3">
            <ThemeToggle />
            <LanguageSwitcher className="border-none" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
