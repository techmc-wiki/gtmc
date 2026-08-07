"use client"

import { signOut } from "next-auth/react"
import { cn } from "@/lib/cn"

type SignOutButtonProps = {
  className?: string
}

export function SignOutButton({ className }: SignOutButtonProps) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className={cn("cursor-pointer", className)}
      type="button">
      SIGN OUT
    </button>
  )
}
