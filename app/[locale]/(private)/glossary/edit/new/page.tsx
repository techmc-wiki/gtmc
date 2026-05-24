import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { createGlossaryDraftAction } from "@/actions/glossary-draft"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function NewGlossaryDraftPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const { prefill: prefillParam } = await searchParams
  const prefillSlug =
    typeof prefillParam === "string" ? prefillParam : undefined

  const { id } = await createGlossaryDraftAction()

  const params = new URLSearchParams()
  if (prefillSlug) params.set("prefill", prefillSlug)
  const qs = params.toString()

  redirect(`/glossary/edit/${id}${qs ? `?${qs}` : ""}`)
}
