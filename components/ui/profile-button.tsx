import * as React from "react"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { BrutalAvatar } from "./brutal-avatar"

export async function ProfileButton() {
  const session = await auth()

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="
          relative flex items-center gap-2 overflow-hidden border
          border-tech-main/40 bg-tech-main/10 px-4 py-1.5 font-mono text-[10px]
          tracking-widest text-tech-main uppercase transition-all duration-300
          hover:bg-tech-main hover:text-white
          md:text-xs
        ">
        <span className="relative z-10 font-bold">LOGIN</span>
      </Link>
    )
  }

  return (
    <Link
      href="/profile"
      className="
        block size-8 transition-transform
        hover:scale-110
        md:size-10
      ">
      <BrutalAvatar
        src={session.user.image}
        alt={session.user.name}
      />
    </Link>
  )
}
