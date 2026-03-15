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
        className="flex items-center gap-2 border border-tech-main/40 bg-tech-main/10 hover:bg-tech-main text-tech-main hover:text-white px-4 py-1.5 font-mono text-[10px] md:text-xs uppercase tracking-widest transition-all duration-300 relative overflow-hidden"
      >
        <span className="relative z-10 font-bold">LOGIN</span>
      </Link>
    );
  }

  return (
    <Link
      href="/profile"
      className="block w-8 h-8 md:w-10 md:h-10 hover:scale-110 transition-transform"
    >
      <BrutalAvatar src={session.user.image} alt={session.user.name} />
    </Link>
  );
}
