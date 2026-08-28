import type { Metadata } from "next"
import type { GlossaryRevision, Revision } from "@prisma/client"

import { getTranslations } from "next-intl/server"

import { deleteDraftAction } from "@/actions/article-draft"
import { deleteGlossaryDraftAction } from "@/actions/glossary-draft"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader, SectionTitle } from "@/components/ui/headings"
import { DraftStatusBadge } from "@/components/ui/status"
import { Badge } from "@/components/ui/shadcn/badge"
import { Button } from "@/components/ui/shadcn/button"
import { Card } from "@/components/ui/shadcn/card"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/shadcn/collapsible"
import { Link } from "@/i18n/navigation"
import { guardUser } from "@/lib/auth/guards"
import { countCleanupFailedByRevision } from "@/lib/drafts/asset-db"
import { decodeStoredDraftFiles } from "@/lib/drafts/files"
import { getArticlePullRequest } from "@/lib/articles/pr"
import { prisma } from "@/lib/prisma"

const ARCHIVED_DRAFT_STATUSES = new Set(["ARCHIVED", "MERGED", "CLOSED"])

const ARCHIVED_GLOSSARY_STATUSES = new Set(["SUBMITTED"])

const dateFormatters: Record<string, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat("en", { dateStyle: "medium" }),
  zh: new Intl.DateTimeFormat("zh", { dateStyle: "medium" }),
}

const primaryActionClassName =
  "group/link border-tech-main-dark bg-tech-main-dark text-tech-bg hover:border-tech-signal hover:bg-tech-signal hover:text-tech-signal-ink focus-visible:outline-tech-main relative inline-flex min-h-11 w-full items-center justify-between gap-4 border px-4 py-2.5 font-mono text-[0.6875rem] font-bold tracking-widest uppercase transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"

const secondaryActionClassName =
  "group/link border-tech-main/40 bg-surface-overlay/60 text-tech-main-dark hover:border-tech-main hover:bg-tech-accent/20 focus-visible:outline-tech-main relative inline-flex min-h-11 w-full items-center justify-between gap-4 border px-4 py-2.5 font-mono text-[0.6875rem] font-bold tracking-widest uppercase transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

type ArticleDraftItem = {
  kind: "article"
  cleanupFailedCount: number
  displayStatus: string
  fileCount: number
} & Revision

type GlossaryDraftItem = {
  kind: "glossary"
} & GlossaryRevision

type DraftItem = ArticleDraftItem | GlossaryDraftItem

interface DraftRecordProps {
  actionLabel: string
  deleteAction?: () => Promise<void>
  deleteLabel: string
  deleteWarning: string
  detail: string
  history?: boolean
  href: `/draft/${string}` | `/glossary/edit/${string}`
  kindLabel: string
  moreActionsLabel: string
  moreActionsLabelForDraft: string
  prLabel: string
  prUrl?: string | null
  status: string
  title: string
  updatedLabel: string
  warning?: string
}

function DraftRecord({
  actionLabel,
  deleteAction,
  deleteLabel,
  deleteWarning,
  detail,
  history = false,
  href,
  kindLabel,
  moreActionsLabel,
  moreActionsLabelForDraft,
  prLabel,
  prUrl,
  status,
  title,
  updatedLabel,
  warning,
}: DraftRecordProps) {
  const content = (
    <div
      className={`grid min-w-0 gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
        history ? "p-4 sm:px-5 sm:py-4" : "p-5 sm:p-6"
      }`}>
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge className="border-tech-main/30 bg-tech-main/5 text-tech-main">
            [{kindLabel}]
          </Badge>
          <DraftStatusBadge status={status} />
          <span className="text-tech-main/55 font-mono text-[0.625rem] tracking-wider uppercase sm:ml-1">
            {updatedLabel}
          </span>
        </div>

        <h3
          className={`display-title text-tech-main-dark text-balance break-words ${
            history ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
          }`}>
          {title}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-tech-main/70 text-sm">{detail}</span>
          {prUrl ? (
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-tech-main hover:text-tech-main-dark focus-visible:outline-tech-main font-mono text-[0.6875rem] tracking-wider uppercase underline decoration-1 underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2">
              {prLabel} <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>

        {warning ? (
          <p className="mt-3 border-l-2 border-red-500/50 pl-3 text-sm text-red-600">
            {warning}
          </p>
        ) : null}
      </div>

      <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:min-w-40 sm:items-end">
        <Link
          href={href}
          className={`${
            history ? secondaryActionClassName : primaryActionClassName
          } sm:w-auto`}>
          <span>{actionLabel}</span>
          <span aria-hidden="true">→</span>
        </Link>
        {deleteAction ? (
          <Collapsible className="w-full text-left sm:w-auto sm:text-right">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-label={moreActionsLabelForDraft}
                className="text-tech-main/60 hover:text-tech-main focus-visible:outline-tech-main inline-flex min-h-11 cursor-pointer items-center font-mono text-[0.625rem] tracking-wider uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2">
                {moreActionsLabel}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-tech-main/20 mt-1 space-y-2 border-t pt-3 sm:w-52">
              <p className="text-tech-main/65 text-xs leading-relaxed">
                {deleteWarning}
              </p>
              <form action={deleteAction}>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  className="min-h-11 w-full text-[0.625rem] uppercase">
                  {deleteLabel}
                </Button>
              </form>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>
    </div>
  )

  if (history) {
    return <li>{content}</li>
  }

  return (
    <article>
      <Card
        tone="main"
        borderOpacity="muted"
        background="default"
        padding="none"
        hover="border"
        brackets="hidden">
        {content}
      </Card>
    </article>
  )
}

export default async function DraftDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await guardUser(locale, `/${locale}/draft`)
  const t = await getTranslations("Drafts")
  const dateFormatter = dateFormatters[locale] ?? dateFormatters.en
  const authorId = session.user.id

  const [allDraftsRaw, glossaryDraftsRaw] = await Promise.all([
    prisma.revision.findMany({
      where: { authorId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.glossaryRevision.findMany({
      where: { authorId },
      orderBy: { updatedAt: "desc" },
    }),
  ])

  const cleanupFailedByRevisionId = new Map<string, number>()
  if (allDraftsRaw.length > 0) {
    const counts = await countCleanupFailedByRevision(
      allDraftsRaw.map((draft) => draft.id)
    )
    for (const [revisionId, count] of counts) {
      cleanupFailedByRevisionId.set(revisionId, count)
    }
  }

  const articleDrafts: ArticleDraftItem[] = await Promise.all(
    allDraftsRaw.map(async (draft) => {
      let displayStatus = draft.status
      const decodedDraft = decodeStoredDraftFiles({
        content: draft.content,
        filePath: draft.filePath,
      })

      if (draft.githubPrNum) {
        try {
          const pr = await getArticlePullRequest(draft.githubPrNum)
          if (pr.state === "closed") {
            displayStatus = pr.merged ? "MERGED" : "CLOSED"
          }
        } catch (error) {
          console.error(`Failed to fetch PR #${draft.githubPrNum}:`, error)
        }
      }

      return Object.assign({}, draft, {
        kind: "article" as const,
        cleanupFailedCount: cleanupFailedByRevisionId.get(draft.id) ?? 0,
        displayStatus,
        fileCount: decodedDraft.files.length,
      })
    })
  )

  const glossaryDrafts: GlossaryDraftItem[] = glossaryDraftsRaw.map((draft) =>
    Object.assign({}, draft, { kind: "glossary" as const })
  )

  const allItems: DraftItem[] = [...articleDrafts, ...glossaryDrafts].toSorted(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  )

  const activeItems = allItems.filter((item) => {
    if (item.kind === "article") {
      return !ARCHIVED_DRAFT_STATUSES.has(item.displayStatus)
    }
    return !ARCHIVED_GLOSSARY_STATUSES.has(item.status)
  })

  const archivedItems = allItems.filter((item) => {
    if (item.kind === "article") {
      return ARCHIVED_DRAFT_STATUSES.has(item.displayStatus)
    }
    return ARCHIVED_GLOSSARY_STATUSES.has(item.status)
  })

  const renderRecord = (item: DraftItem, history = false) => {
    const isArticle = item.kind === "article"
    const title = isArticle
      ? item.title || t("untitledArticle")
      : item.title || t("untitledGlossary")
    const status = isArticle ? item.displayStatus : item.status
    const canContinue = status === "DRAFT"
    const actionLabel = canContinue ? t("continueDraft") : t("viewDraft")
    const detail = isArticle
      ? t("filesCount", { count: item.fileCount })
      : t("changesCount", {
          count: Array.isArray(item.operations) ? item.operations.length : 0,
        })
    const href = isArticle
      ? (`/draft/${item.id}` as const)
      : (`/glossary/edit/${item.id}` as const)
    const canDelete = isArticle
      ? item.status === "DRAFT" && !item.githubPrNum
      : item.status === "DRAFT"

    const deleteAction =
      !history && canDelete
        ? async () => {
            "use server"
            if (isArticle) {
              await deleteDraftAction(item.id)
            } else {
              await deleteGlossaryDraftAction(item.id)
            }
          }
        : undefined

    return (
      <DraftRecord
        key={`${item.kind}:${item.id}`}
        actionLabel={actionLabel}
        deleteAction={deleteAction}
        deleteLabel={t("deleteDraft")}
        deleteWarning={t("deleteWarning")}
        detail={detail}
        history={history}
        href={href}
        kindLabel={isArticle ? t("articleType") : t("glossaryType")}
        moreActionsLabel={t("moreActions")}
        moreActionsLabelForDraft={t("moreActionsFor", { title })}
        prLabel={t("openPullRequest")}
        prUrl={item.githubPrUrl}
        status={status}
        title={title}
        updatedLabel={t("updatedAt", {
          date: dateFormatter.format(item.updatedAt),
        })}
        warning={
          isArticle && item.cleanupFailedCount > 0
            ? t("cleanupWarning")
            : undefined
        }
      />
    )
  }

  return (
    <div className="page-container animate-fade-in">
      <PageHeader title={t("pageTitle")} />

      <p className="text-tech-main max-w-2xl text-base leading-relaxed">
        {t("pageDescription")}
      </p>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="min-w-0 lg:col-start-1 lg:row-start-1">
          <SectionTitle className="mb-4">
            <span>{t("inProgress")}</span>
            <span className="text-tech-main/50 ml-auto font-mono text-xs font-normal tracking-widest">
              {activeItems.length}
            </span>
          </SectionTitle>

          {activeItems.length === 0 ? (
            <EmptyState
              message={t("noActiveTitle")}
              className="py-12 [&_h2]:text-base [&_h2]:normal-case"
            />
          ) : (
            <div className="space-y-4">
              {activeItems.map((item) => renderRecord(item))}
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-28 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <Card
            tone="main"
            borderOpacity="medium"
            background="subtle"
            padding="default"
            hover="none"
            brackets="visible"
            bracketVariant="static"
            className="border-t-tech-signal border-t-2">
            <p className="text-tech-main/60 font-mono text-[0.625rem] tracking-[0.22em] uppercase">
              {t("newDraftLabel")}
            </p>
            <h2 className="display-title text-tech-main-dark mt-2 text-2xl">
              {t("newDraftTitle")}
            </h2>
            <p className="text-tech-main/75 mt-3 text-sm leading-relaxed">
              {t("newDraftDescription")}
            </p>

            <div className="mt-6 space-y-3">
              <Link href="/draft/new" className={primaryActionClassName}>
                <span>{t("newArticle")}</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/glossary/edit/new"
                className={secondaryActionClassName}>
                <span>{t("newGlossary")}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </Card>
        </aside>

        {archivedItems.length > 0 ? (
          <section className="min-w-0 lg:col-start-1 lg:row-start-2">
            <SectionTitle className="mb-4">
              <span>{t("pastWork")}</span>
              <span className="text-tech-main/50 ml-auto font-mono text-xs font-normal tracking-widest">
                {archivedItems.length}
              </span>
            </SectionTitle>
            <Card
              tone="main"
              borderOpacity="subtle"
              background="ghost"
              padding="none"
              hover="none"
              brackets="hidden">
              <ul className="divide-tech-main/15 divide-y">
                {archivedItems.map((item) => renderRecord(item, true))}
              </ul>
            </Card>
          </section>
        ) : null}
      </div>
    </div>
  )
}
