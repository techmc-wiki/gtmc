import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getLocale } from "next-intl/server"

import { GlossaryEditor } from "@/components/glossary/glossary-editor"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  loadGlossaryManifest,
  loadGlossarySummary,
} from "@/lib/glossary/manifest"
import type { GlossaryRow } from "@/lib/glossary/csv"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

interface GlossaryDraftOperation {
  kind: "edit" | "add" | "delete"
  slug: string
  before?: GlossaryRow
  after?: GlossaryRow
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

  const draft = await prisma.glossaryRevision.findUnique({ where: { id } })
  if (!draft || draft.authorId !== session.user.id) {
    notFound()
  }

  const githubLogin = (session as { user?: { githubLogin?: string } }).user
    ?.githubLogin
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "github" },
    select: { providerAccountId: true },
  })

  const noreplyEmail =
    githubLogin && account?.providerAccountId
      ? `${account.providerAccountId}+${githubLogin}@users.noreply.github.com`
      : (session.user.email ?? "glossary-bot@gtmc.dev")

  const realEmail = session.user.email ?? null
  const authorName = session.user.name ?? "GTMC Glossary Contributor"

  const manifest = await loadGlossaryManifest()
  const summary = loadGlossarySummary()
  const locale = await getLocale()

  const operations = (draft.operations ??
    []) as unknown as GlossaryDraftOperation[]

  return (
    <GlossaryEditor
      draftId={draft.id}
      initialTitle={draft.title ?? ""}
      initialOperations={operations}
      prefillSlug={prefillSlug}
      manifestEntries={manifest.entries}
      summaryEntries={summary}
      locale={locale}
      authorName={authorName}
      noreplyEmail={noreplyEmail}
      realEmail={realEmail}
    />
  )
}
