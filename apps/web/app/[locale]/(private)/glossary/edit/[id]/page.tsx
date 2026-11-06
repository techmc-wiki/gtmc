import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getLocale } from "next-intl/server"
import { Suspense } from "react"

import { GlossaryEditor } from "@/components/glossary/glossary-editor"
import { SegmentedBar } from "@/components/ui/loading-shell-primitives"
import { auth } from "@/lib/auth"
import { readDraft } from "@/lib/drafts/store"
import { getAuthorIdentity, requireAuth } from "@/lib/auth/context"
import {
  loadGlossaryManifest,
  loadGlossarySummary,
} from "@/lib/glossary/manifest"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

function EditGlossaryFallback() {
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

export default function EditGlossaryDraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  return (
    <Suspense fallback={<EditGlossaryFallback />}>
      <EditGlossaryDraft params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function EditGlossaryDraft({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const { id } = await params
  const { prefill } = await searchParams
  const prefillSlug = typeof prefill === "string" ? prefill : undefined

  const record = await readDraft(session.user.id, id)
  if (!record || record.draft.kind !== "glossary") notFound()
  const draft = record.draft
  const identity = await getAuthorIdentity(await requireAuth())
  const noreplyEmail = identity.email
  const realEmail = session.user.email ?? null
  const authorName = identity.name

  const manifest = await loadGlossaryManifest()
  const summary = loadGlossarySummary()
  const locale = await getLocale()

  return (
    <GlossaryEditor
      draftId={draft.id}
      initialEtag={record.etag}
      initialTitle={draft.title ?? ""}
      initialOperations={draft.operations}
      prefillSlug={prefillSlug}
      manifestEntries={manifest.entries}
      summaryEntries={summary}
      locale={locale}
      authorName={authorName}
      noreplyEmail={noreplyEmail}
      realEmail={realEmail}
      status={draft.status}
      githubPrUrl={draft.githubPrUrl}
      githubPrNum={draft.githubPrNum}
    />
  )
}
