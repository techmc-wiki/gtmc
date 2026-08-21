"use client"

import * as React from "react"
import Image from "next/image"
import { SessionProvider, useSession } from "next-auth/react"
import { Link } from "@/i18n/navigation"
import { SignOutButton } from "@/components/ui/sign-out-button"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/shadcn/avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/shadcn/dropdown-menu"

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
        className="border-tech-main/40 bg-tech-main/10 text-tech-main hover:bg-tech-main-dark hover:text-tech-bg flex size-full items-center justify-center border font-mono text-[0.6rem] font-bold uppercase transition-all duration-300 md:text-xs">
        LOGIN
      </Link>
    )
  }

  // Authenticated state: Avatar trigger + name dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Link
          href="/profile"
          className="block size-8 transition-transform hover:scale-110 md:size-10"
          aria-label={session.user.name ?? undefined}>
          <Avatar className="border-tech-main/60 bg-tech-main/10 ring-tech-main/20 relative box-border flex aspect-square size-full items-center justify-center overflow-hidden border-2 p-1 ring-1">
            {session.user.image ? (
              <AvatarImage asChild src={session.user.image}>
                <Image
                  src={session.user.image}
                  alt={session.user.name || "Avatar"}
                  fill
                  sizes="(max-width: 768px) 32px, 40px"
                  loading="lazy"
                  className="object-cover"
                />
              </AvatarImage>
            ) : (
              <AvatarFallback className="text-tech-main/50 bg-transparent font-mono text-xl font-bold tracking-widest uppercase">
                {(session.user.name || "?")[0]}
              </AvatarFallback>
            )}
          </Avatar>
        </Link>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="border-tech-main/30 bg-surface-overlay/95 w-48 border p-2 shadow-lg backdrop-blur-sm">
        <div className="guide-line mb-2 border-b pb-2">
          <p className="text-tech-main-dark truncate font-mono text-xs font-bold">
            {session.user.name}
          </p>
          <p className="text-tech-main/70 truncate font-mono text-[0.625rem]">
            {session.user.email}
          </p>
        </div>
        <DropdownMenuGroup className="flex flex-col gap-1">
          <DropdownMenuItem
            asChild
            className="text-tech-main-dark hover:bg-tech-main/10 focus:bg-tech-main/10 focus:text-tech-main-dark cursor-pointer rounded-none px-2 py-1.5 font-mono text-[0.625rem] transition-colors">
            <Link href="/profile">PROFILE</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            className="rounded-none px-0 py-0 hover:bg-transparent focus:bg-transparent">
            <SignOutButton className="text-tech-main-dark hover:bg-tech-main/10 w-full px-2 py-1.5 text-left font-mono text-[0.625rem] transition-colors" />
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
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
