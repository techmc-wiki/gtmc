import type { Metadata } from "next"
import React from "react"

export const metadata: Metadata = {
  title: "Login",
  description: "Authenticate to access GTMC Wiki.",
  robots: { index: false, follow: false },
}

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
