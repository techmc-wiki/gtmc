import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { NewGlossaryDraftStarter } from "./new-glossary-draft-starter"
import { auth } from "@/lib/auth"

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

  return <NewGlossaryDraftStarter prefillSlug={prefillSlug} />
}
