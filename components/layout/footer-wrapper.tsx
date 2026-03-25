"use client"

import { usePathname } from "next/navigation"
import Footer from "@/components/layout/footer"
import { useFooter } from "@/components/layout/footer-context"

export function FooterWrapper() {
  const pathname = usePathname()
  const { hidden } = useFooter()

  if (hidden || pathname === "/") return null

  return <Footer />
}
