"use client"

import { usePathname } from "@/i18n/navigation"

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div
      key={pathname}
      className="min-h-[calc(100vh-8rem)] animate-page-transit">
      {children}
    </div>
  )
}
