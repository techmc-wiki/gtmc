"use client"

import * as React from "react"
import Image from "next/image"
import { SessionProvider, useSession, signOut } from "next-auth/react"
import { useTranslations } from "next-intl"
import { LogOut, User } from "lucide-react"
import { Link } from "@/i18n/navigation"
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
  const t = useTranslations("IconActions")

  // Loading state: pulse skeleton sized to the resolved avatar footprint so
  // the header controls do not shift when the session lands.
  if (status === "loading") {
    return (
      <div className="flex size-11 items-center justify-center">
        <div className="border-tech-main/30 bg-tech-main/5 size-8 animate-pulse border" />
      </div>
    )
  }

  // Error state: fallback to logged-out state (login button)
  if (status === "unauthenticated" || !session?.user) {
    return (
      <Link
        href="/login"
        className="border-tech-main/40 bg-tech-main/10 text-tech-main hover:bg-tech-main-dark hover:text-tech-bg flex size-full items-center justify-center border font-mono text-xs font-bold uppercase transition-colors duration-300">
        {t("login")}
      </Link>
    )
  }

  // Authenticated state: Avatar trigger + name dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={session.user.name ?? undefined}
          className="hover:bg-tech-main/10 focus-visible:outline-tech-main flex size-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2">
          <Avatar className="border-tech-main/30 bg-tech-main/10 relative size-8 overflow-hidden border">
            {session.user.image ? (
              <AvatarImage asChild src={session.user.image}>
                <Image
                  src={session.user.image}
                  alt={session.user.name || "Avatar"}
                  fill
                  sizes="32px"
                  loading="lazy"
                  className="object-cover"
                />
              </AvatarImage>
            ) : (
              <AvatarFallback className="text-tech-main/70 bg-transparent font-mono text-xs font-bold uppercase">
                {(session.user.name || "?")[0]}
              </AvatarFallback>
            )}
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="border-tech-main/30 bg-surface-overlay/95 w-48 border p-2 shadow-lg backdrop-blur-sm">
        <div className="guide-line mb-2 border-b pb-2">
          <p className="text-tech-main-dark truncate font-mono text-xs font-bold">
            {session.user.name}
          </p>
          <p className="text-tech-main/70 truncate font-mono text-xs">
            {session.user.email}
          </p>
        </div>
        <DropdownMenuGroup className="flex flex-col gap-1">
          <DropdownMenuItem
            asChild
            className="text-tech-main-dark hover:bg-tech-main/10 focus:bg-tech-main/10 focus:text-tech-main-dark cursor-pointer rounded-none px-2 py-1.5 font-mono text-xs transition-colors">
            <Link href="/profile">
              <User aria-hidden="true" className="size-3.5" />
              <span>{t("profile")}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => signOut({ callbackUrl: "/" })}
            className="text-tech-main-dark hover:bg-tech-main/10 focus:bg-tech-main/10 focus:text-tech-main-dark cursor-pointer rounded-none px-2 py-1.5 font-mono text-xs transition-colors">
            <LogOut aria-hidden="true" className="size-3.5" />
            <span>{t("signOut")}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AuthIsland() {
  return (
    <div className="relative size-11 shrink-0">
      <SessionProvider>
        <AuthIslandContent />
      </SessionProvider>
    </div>
  )
}
