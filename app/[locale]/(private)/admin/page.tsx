import type { Metadata } from "next"
import { guardAdmin } from "@/lib/auth/guards"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  await guardAdmin(locale, `/${locale}/admin`)
  return <div>Admin</div>
}
