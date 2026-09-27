import type { Metadata } from "next"
import { StatusPage } from "@/components/layout/status-page"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function Forbidden() {
  return <StatusPage kind="forbidden" />
}
