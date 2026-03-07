import * as React from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { BrutalAvatar } from "./brutal-avatar";

// A dummy login button component to use here if needed, or simply a Link to /login
export async function ProfileButton() {
  const session = await auth();

  if (!session?.user) {
    return (
      <Link href="/login" className="font-bold border-2 border-black px-4 py-1 hover:bg-black hover:text-white transition-colors">
        LOGIN
      </Link>
    );
  }

  return (
    <Link href="/profile" className="block hover:-translate-y-1 hover:translate-x-1 transition-transform">
      <BrutalAvatar src={session.user.image} alt={session.user.name} />
    </Link>
  );
}
