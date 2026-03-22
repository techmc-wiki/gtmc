import * as React from "react"
import Link from "next/link"

import { ProfileButton } from "@/components/ui/profile-button"
import { Logo } from "@/components/ui/logo"
import { MobileNav } from "./mobile-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const navLinks = [
    { href: "/articles", label: "DATABASE" },
    { href: "/draft", label: "MY DRAFTS" },
    { href: "/review", label: "REVIEW HUB" },
    { href: "/features", label: "FEATURES" },
  ]

  return (
    <div className="
      relative flex min-h-screen w-full flex-col font-sans text-tech-main
      selection:bg-tech-main/20 selection:text-tech-main-dark
    ">
      <nav className="
        sticky top-0 z-50 border-b border-tech-main/40 bg-white/60
        backdrop-blur-md
      ">
        <div className="absolute top-0 left-0 h-px w-full bg-tech-main/20"></div>
        <div className="
          mx-auto max-w-[1800px] px-4
          sm:px-6
          lg:px-8
        ">
          <div className="
            flex h-16 items-center justify-between
            md:h-20
          ">
            <div className="
              flex items-center space-x-4
              md:space-x-8
            ">
              <Logo size="md" />
              <div className="
                hidden space-x-6 pt-1
                md:flex
              ">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="
                      border-b-2 border-transparent pb-1 font-mono text-xs
                      tracking-[0.15em] text-tech-main-dark transition-colors
                      hover:border-tech-main hover:text-tech-main
                    ">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <MobileNav navLinks={navLinks} />
              <React.Suspense
                fallback={
                  <div className="
                    size-8 animate-pulse rounded-none border border-tech-main/40
                    bg-tech-main/10
                    md:size-10
                  " />
                }>
                <ProfileButton />
              </React.Suspense>
            </div>
          </div>
        </div>
      </nav>

      <main className="
        relative z-10 mx-auto w-full max-w-[1800px] flex-1 p-4
        sm:p-6
        lg:p-8
      ">
        <div className="
          absolute top-0 left-0 hidden h-full w-px bg-tech-main/20
          lg:block
        "></div>
        <div className="
          absolute top-0 right-0 hidden h-full w-px bg-tech-main/20
          lg:block
        "></div>
        {children}
      </main>
    </div>
  )
}
