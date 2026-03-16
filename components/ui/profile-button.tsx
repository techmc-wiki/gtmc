import * as React from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { BrutalAvatar } from "./brutal-avatar";

export async function ProfileButton() {
  const session = await auth();

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="border-tech-main/40 bg-tech-main/10 hover:bg-tech-main text-tech-main relative flex items-center gap-2 overflow-hidden border px-4 py-1.5 font-mono text-[10px] tracking-widest uppercase transition-all duration-300 hover:text-white md:text-xs"
      >
        <span className="relative z-10 font-bold">LOGIN</span>
      </Link>
    );
  }

  return (
    <Link
      href="/profile"
      className="block h-8 w-8 transition-transform hover:scale-110 md:h-10 md:w-10"
    >
      <BrutalAvatar src={session.user.image} alt={session.user.name} />
    </Link>
  );
}
