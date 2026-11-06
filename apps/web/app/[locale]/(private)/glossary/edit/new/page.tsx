import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { SegmentedBar } from "@/components/ui/loading-shell-primitives"
import { NewGlossaryDraftStarter } from "./new-glossary-draft-starter"
import { auth } from "@/lib/auth"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function NewGlossaryDraftPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  return (
    <Suspense fallback={<NewGlossaryDraftFallback />}>
      <NewGlossaryDraft searchParams={searchParams} />
    </Suspense>
  )
}

async function NewGlossaryDraft({
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

function NewGlossaryDraftFallback() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex h-[70vh] w-full flex-col gap-3">
      <SegmentedBar opacity="low" className="h-4 w-40" />
      <div className="border-tech-main/20 bg-surface-overlay/30 w-full flex-1 border" />
    </div>
  )
}
