"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: "/" })} 
      className={`font-black tracking-widest uppercase text-[#3c4a63] hover:text-red-500 transition-colors text-sm flex items-center justify-center ${className}`}
      type="button"
    >
      SIGN OUT
    </button>
  );
}
