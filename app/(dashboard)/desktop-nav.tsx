"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface NavLink {
  href: string
  label: string
}

interface DesktopNavProps {
  navLinks: NavLink[]
}

export function DesktopNav({ navLinks }: DesktopNavProps) {
  const pathname = usePathname()

  return (
    <div
      className="
        hidden space-x-6 pt-1
        md:flex
      ">
      {navLinks.map((link) => {
        const isActive = pathname.startsWith(link.href)

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`
              border-b-2 pb-1 font-mono text-xs tracking-[0.15em]
              transition-colors
              ${
                isActive
                  ? "border-tech-main text-tech-main"
                  : "border-transparent text-tech-main-dark hover:border-tech-main hover:text-tech-main"
              }
            `}>
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}
