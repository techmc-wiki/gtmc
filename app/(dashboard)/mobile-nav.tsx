"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface NavLink {
  href: string
  label: string
}

interface MobileNavProps {
  navLinks: NavLink[]
}

export function MobileNav({ navLinks }: MobileNavProps) {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)
  const pathname = usePathname()

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  React.useEffect(() => {
    setIsDrawerOpen(false)
  }, [pathname])

  return (
    <>
      <button
        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
        className="
          flex min-h-11 min-w-11 cursor-pointer flex-col items-center
          justify-center gap-1.5 p-2 transition-colors
          hover:bg-tech-main/10
          md:hidden
        "
        aria-label="Toggle navigation menu"
        aria-expanded={isDrawerOpen}>
        <span
          className={`
            h-0.5 w-5 bg-tech-main transition-all
            ${isDrawerOpen ? `translate-y-2 rotate-45` : ""}
          `}></span>
        <span
          className={`
            h-0.5 w-5 bg-tech-main transition-all
            ${isDrawerOpen ? `opacity-0` : ""}
          `}></span>
        <span
          className={`
            h-0.5 w-5 bg-tech-main transition-all
            ${isDrawerOpen ? `-translate-y-2 -rotate-45` : ""}
          `}></span>
      </button>

      {isMounted &&
        createPortal(
          <div>
            {isDrawerOpen && (
              <div
                className="
                  fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-screen
                  bg-tech-main-dark/20 backdrop-blur-xs
                  supports-[height:100dvh]:h-[calc(100dvh-4rem)]
                  supports-[width:100dvw]:w-dvw
                  md:hidden
                "
                onClick={() => setIsDrawerOpen(false)}
                aria-hidden="true"
              />
            )}

            <div
              className={`
                fixed inset-x-0 top-16 z-40 overflow-hidden border-b
                border-tech-main/40 bg-white/95 backdrop-blur-md transition-all
                duration-300
                md:hidden
                ${isDrawerOpen ? "max-h-screen" : "max-h-0"}
              `}>
              <div
                className="
                  space-y-2 p-4
                  sm:p-6
                ">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="
                      flex min-h-11 items-center border border-tech-main/40
                      bg-white/60 p-3 font-mono text-xs tracking-[0.15em]
                      text-tech-main-dark transition-colors
                      hover:bg-tech-main hover:text-white
                    ">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
