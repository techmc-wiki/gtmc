import * as React from "react"
import { getTranslations } from "next-intl/server"
import { DesktopNav } from "@/components/layout/desktop-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { SiteShell } from "@/components/layout/site-shell"
import { Logo } from "@/components/ui/logo"

export default async function PdfLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations("Nav")
  const navLinks = [
    { href: "/articles", label: t("articles") },
    { href: "/pdf", label: "PDF" },
  ]

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
          <LanguageSwitcher className="hidden sm:flex" />
        </>
      }>
      {children}
    </SiteShell>
  )
}
