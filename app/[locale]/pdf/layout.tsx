import * as React from "react"
import { getTranslations } from "next-intl/server"
import { DesktopNav } from "@/components/layout/desktop-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { SiteShell } from "@/components/layout/site-shell"
import { Logo } from "@/components/ui/logo"

function buildNavLinks(t: Awaited<ReturnType<typeof getTranslations<"Nav">>>) {
  return [
    { href: "/articles", label: t("articles") },
    { href: "/pdf", label: "PDF" },
  ]
}

export default async function PdfLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations("Nav")
  const navLinks = buildNavLinks(t)

  return (
    <SiteShell
      leftSlot={
        <>
          <Logo size="md" />
          <DesktopNav navLinks={navLinks} />
        </>
      }
      rightSlot={
        <>
          <MobileNav navLinks={navLinks} />
          <ThemeToggle className="hidden sm:flex" />
          <LanguageSwitcher className="hidden sm:flex" />
        </>
      }>
      {children}
    </SiteShell>
  )
}
