import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getCurrentUserAuthContext } from "@/lib/auth/context"

export async function guardUser(locale: string, callbackUrl: string) {
  const session = await auth()
  if (!session?.user) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }
  return session
}

export async function guardAdmin(locale: string, callbackUrl: string) {
  const session = await guardUser(locale, callbackUrl)
  const context = await getCurrentUserAuthContext(session.user.id)
  if (context.role !== "ADMIN") {
    redirect(`/${locale}/forbidden`)
  }
  return session
}
