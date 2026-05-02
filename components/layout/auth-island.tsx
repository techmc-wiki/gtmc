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
      <div
        className="
          flex h-8 w-20 animate-pulse items-center justify-center
          border border-tech-main/20 bg-tech-main/5
          md:h-10 md:w-24
        ">
        <div className="h-2 w-12 bg-tech-main/20" />
      </div>
    )
  }

  // Error state: fallback to logged-out state (login button)
  if (status === "unauthenticated" || !session?.user) {
    return (
      <Link
        href="/login"
        className="
          flex h-8 items-center justify-center border border-tech-main/40 bg-tech-main/10 px-3 font-mono text-[0.625rem]
          font-bold tracking-widest text-tech-main uppercase transition-all
          duration-300 hover:bg-tech-main hover:text-white
          md:text-xs
        ">
        LOGIN
      </Link>
    )
  }

  // Authenticated state: Avatar + name dropdown (matching ProfileButton behavior)
  return (
    <div className="group relative">
      <Link
        href="/profile"
        className="
          block size-8 transition-transform
          hover:scale-110
          md:size-10
        ">
        <UesrAvatar src={session.user.image} alt={session.user.name} />
      </Link>

      {/* Dropdown menu */}
      <div
        className="
          absolute top-full right-0 z-50 mt-2 w-48 origin-top-right
          border border-tech-main/30 bg-white/95 p-2 opacity-0 shadow-lg backdrop-blur-sm
          transition-all duration-200 pointer-events-none
          group-hover:opacity-100 group-hover:pointer-events-auto
        ">
        <div className="border-b border-tech-main/20 pb-2 mb-2">
          <p className="font-mono text-xs font-bold text-tech-main-dark truncate">
            {session.user.name}
          </p>
          <p className="font-mono text-[0.625rem] text-tech-main/70 truncate">
            {session.user.email}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <Link
            href="/profile"
            className="
              px-2 py-1.5 font-mono text-[0.625rem] text-tech-main-dark
              transition-colors hover:bg-tech-main/10
            ">
            PROFILE
          </Link>
          <SignOutButton
            className="
              w-full px-2 py-1.5 text-left font-mono text-[0.625rem] text-tech-main-dark
              transition-colors hover:bg-tech-main/10
            "
          />
        </div>
      </div>
    </div>
  )
}

export function AuthIsland() {
  return (
    <SessionProvider>
      <AuthIslandContent />
    </SessionProvider>
  )
}
