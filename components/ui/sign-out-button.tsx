"use client";

import { signOut } from "next-auth/react";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className = "" }: SignOutButtonProps) {
  return (
    <button onClick={() => signOut({ callbackUrl: "/" })} className={className} type="button">
      SIGN OUT
    </button>
  );
}
