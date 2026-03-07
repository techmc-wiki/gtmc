"use client";

import { signOut } from "next-auth/react";
import { BrutalButton } from "@/components/ui/brutal-button";

export function SignOutButton() {
  return (
    <BrutalButton variant="ghost" onClick={() => signOut({ callbackUrl: "/" })} className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-500 w-full mt-4">
      SIGN OUT
    </BrutalButton>
  );
}
