import type { Metadata } from "next"
// oxlint-disable-next-line import/no-unassigned-import
import "../auth.css"
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
