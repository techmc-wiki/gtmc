import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getLocale } from "next-intl/server"

import { GlossaryEditor } from "@/components/glossary/glossary-editor"
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

export default async function EditGlossaryDraftPage({
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
