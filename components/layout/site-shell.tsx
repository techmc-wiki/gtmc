import * as React from "react"

interface SiteShellProps {
  leftSlot: React.ReactNode
  rightSlot: React.ReactNode
  children: React.ReactNode
}

export function SiteShell({ leftSlot, rightSlot, children }: SiteShellProps) {
  return (
    <div className="text-tech-main selection:bg-tech-main/20 selection:text-tech-main-dark relative flex min-h-screen w-full max-w-full flex-col overflow-x-clip font-sans">
      <nav className="border-tech-main/40 sticky top-0 z-50 w-full border-b bg-white/60 backdrop-blur-sm">
        <div className="bg-tech-main/20 absolute top-0 left-0 h-px w-full" />
        <div className="mx-auto max-w-450 px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between md:h-20">
            <div className="flex space-x-4 md:space-x-8">{leftSlot}</div>

            <div className="flex items-center gap-4">{rightSlot}</div>
          </div>
        </div>
      </nav>

      <main className="relative w-full max-w-full min-w-0 p-4 sm:p-6 lg:px-24 lg:py-8">
        {children}
      </main>
    </div>
  )
}
