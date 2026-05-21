"use client"

import { usePathname } from "@/i18n/navigation"
import { useFooter } from "@/components/layout/footer-context"
import type { ReactNode } from "react"

export function FooterWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { hidden } = useFooter()

  if (hidden || pathname === "/") return null

  return <>{children}</>
}
