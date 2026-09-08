"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/shadcn/button"

type SignOutButtonProps = {
  className?: string
}

export function SignOutButton({ className }: SignOutButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={className}
      type="button">
      Sign out
    </Button>
  )
}
