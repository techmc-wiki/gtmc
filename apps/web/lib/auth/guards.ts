import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export async function guardUser(locale: string, callbackUrl: string) {
  const session = await auth()
  if (!session?.user) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }
  return session
}
