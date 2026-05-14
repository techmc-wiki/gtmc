"use client"

import * as React from "react"
import { SessionProvider, useSession } from "next-auth/react"
import { Link } from "@/i18n/navigation"
import { UesrAvatar } from "@/components/ui/user-avatar"
import { SignOutButton } from "@/components/ui/sign-out-button"

function AuthIslandContent() {
  const { data: session, status } = useSession()

  // Loading state: pulse skeleton matching dashboard style
  if (status === "loading") {
    return (
      <div className="guide-line bg-tech-main/5 flex size-full animate-pulse items-center justify-center border">
        <div className="bg-tech-main/20 size-2" />
      </div>
    )
  }

  // Error state: fallback to logged-out state (login button)
  if (status === "unauthenticated" || !session?.user) {
    return (
      <Link
        href="/login"
        aria-label="LOGIN"
        className="border-tech-main/40 bg-tech-main/10 text-tech-main hover:bg-tech-main flex size-full items-center justify-center border font-mono text-[0.625rem] font-bold tracking-widest uppercase transition-all duration-300 hover:text-white md:text-xs">
        IN
      </Link>
    )
  }

  // Authenticated state: Avatar + name dropdown (matching ProfileButton behavior)
  return (
    <div className="group relative">
      <Link
        href="/profile"
        className="block size-8 transition-transform hover:scale-110 md:size-10">
        <UesrAvatar src={session.user.image} alt={session.user.name} />
      </Link>

      {/* Dropdown menu */}
      <div className="border-tech-main/30 pointer-events-none absolute top-full right-0 z-50 mt-2 w-48 origin-top-right border bg-white/95 p-2 opacity-0 shadow-lg backdrop-blur-sm transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
        <div className="guide-line mb-2 border-b pb-2">
          <p className="text-tech-main-dark truncate font-mono text-xs font-bold">
            {session.user.name}
          </p>
          <p className="text-tech-main/70 truncate font-mono text-[0.625rem]">
            {session.user.email}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <Link
            href="/profile"
            className="text-tech-main-dark hover:bg-tech-main/10 px-2 py-1.5 font-mono text-[0.625rem] transition-colors">
            PROFILE
          </Link>
          <SignOutButton className="text-tech-main-dark hover:bg-tech-main/10 w-full px-2 py-1.5 text-left font-mono text-[0.625rem] transition-colors" />
        </div>
      </div>
    </div>
  )
}

export function AuthIsland() {
  return (
    <div className="relative size-8 shrink-0 md:size-10">
      <SessionProvider>
        <AuthIslandContent />
      </SessionProvider>
    </div>
  )
}
