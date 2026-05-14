"use client"

import { Link } from "@/i18n/navigation"
import { usePathname } from "@/i18n/navigation"

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
    <>
      <ul className="mb-1.5 hidden space-x-6 md:flex">
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.href)

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`border-b-2 pb-1 font-mono text-xs tracking-[0.15em] transition-colors ${
                  isActive
                    ? "border-tech-main text-tech-main"
                    : `text-tech-main-dark hover:border-tech-main hover:text-tech-main border-transparent`
                } `}>
                {link.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
