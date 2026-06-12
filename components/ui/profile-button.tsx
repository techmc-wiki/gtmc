import * as React from "react"
import { Link } from "@/i18n/navigation"
import { auth } from "@/lib/auth"
import { UserAvatar } from "./user-avatar"

export async function ProfileButton() {
  const session = await auth()

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="border-tech-main/40 bg-tech-main/10 text-tech-main hover:bg-tech-main-dark hover:text-tech-bg flex h-8 items-center justify-center border px-3 font-mono text-[0.625rem] font-bold tracking-widest uppercase transition-all duration-300 md:text-xs">
        LOGIN
      </Link>
    )
  }

  return (
    <Link
      href="/profile"
      className="block size-8 transition-transform hover:scale-110 md:size-10">
      <UserAvatar src={session.user.image} alt={session.user.name} />
    </Link>
  )
}
