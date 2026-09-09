"use client"

import { signOut } from "next-auth/react"
import { IconButton } from "@/components/ui/icon-button"
import { LogOut } from "lucide-react"
import { useTranslations } from "next-intl"

type SignOutButtonProps = {
  className?: string
}

export function SignOutButton({ className }: SignOutButtonProps) {
  const t = useTranslations("IconActions")
  return (
    <IconButton
      label={t("signOut")}
      variant="outline"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={className}
      type="button">
      <LogOut aria-hidden />
    </IconButton>
  )
}
