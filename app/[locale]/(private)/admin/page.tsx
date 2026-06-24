import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { getCurrentUserAuthContext } from "@/lib/auth/context"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { TechButton } from "@/components/ui/tech-button"
import { Link } from "@/i18n/navigation"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const [{ locale }, t, session] = await Promise.all([
    params,
    getTranslations("Review"),
    auth(),
  ])

  if (!session?.user) {
    redirect(
      `/${locale}/login?callbackUrl=${encodeURIComponent("/" + locale + "/admin")}`
    )
  }

  let isAdmin: boolean
  try {
    const ctx = await getCurrentUserAuthContext(session.user.id)
    isAdmin = ctx.role === "ADMIN"
  } catch (error) {
    console.error("[admin] admin context failed:", error)
    isAdmin = false
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto mt-20 max-w-6xl p-8 text-center">
        <h1 className="text-6xl font-black text-red-500 uppercase">
          {t("accessDenied")}
        </h1>
        <p className="mt-4 text-xl font-bold">{t("adminRequired")}</p>
        <Link href="/">
          <TechButton variant="primary" className="mt-8">
            {t("returnToBase")}
          </TechButton>
        </Link>
      </div>
    )
  }

  return <div>Admin</div>
}
