"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/cn"

export interface AttributionWarningProps {
  authorName: string
  githubNoreplyEmail: string
  realEmail: string | null
  useRealEmail: boolean
  onUseRealEmailChange: (value: boolean) => void
  className?: string
}

const AuthorNameTag = (chunks: React.ReactNode) => (
  <strong className="text-tech-main-dark font-semibold">{chunks}</strong>
)

const AuthorEmailTag = (chunks: React.ReactNode) => (
  <span className="text-tech-main/70 font-mono text-xs">&lt;{chunks}&gt;</span>
)

export function AttributionWarning({
  authorName,
  githubNoreplyEmail,
  realEmail,
  useRealEmail,
  onUseRealEmailChange,
  className,
}: AttributionWarningProps) {
  const t = useTranslations("Glossary")

  const canToggleRealEmail =
    realEmail !== null && realEmail !== githubNoreplyEmail

  const displayedEmail =
    canToggleRealEmail && useRealEmail && realEmail !== null
      ? realEmail
      : githubNoreplyEmail

  return (
    <div
      className={cn(
        "border-tech-line/20 bg-surface-overlay/80 flex flex-col border backdrop-blur-sm",
        className
      )}>
      <section className="flex flex-col gap-2 px-4 py-3 sm:px-5 sm:py-4">
        <span
          aria-hidden="true"
          className="text-tech-main/60 font-mono text-[10px] tracking-widest uppercase">
          {t("editorAttributionLabel")}
        </span>
        <p className="text-tech-main text-sm leading-relaxed">
          {t.rich("editorAttributionBody", {
            name: authorName,
            email: displayedEmail,
            authorName: AuthorNameTag,
            authorEmail: AuthorEmailTag,
          })}
        </p>
      </section>

      {canToggleRealEmail ? (
        <section className="border-tech-line/20 flex flex-col gap-2 border-t px-4 py-3 sm:px-5 sm:py-4">
          <label className="text-tech-main hover:text-tech-main-dark group flex cursor-pointer items-start gap-3 text-sm leading-relaxed transition-colors">
            <input
              type="checkbox"
              checked={useRealEmail}
              onChange={(event) => onUseRealEmailChange(event.target.checked)}
              aria-label={t("editorRealEmailToggleLabel")}
              className="border-tech-line accent-tech-accent bg-surface-input mt-0.5 size-4 cursor-pointer border"
            />
            <span>{t("editorRealEmailToggleLabel")}</span>
          </label>
        </section>
      ) : null}

      <section className="border-tech-line/20 flex flex-col gap-2 border-t px-4 py-3 sm:px-5 sm:py-4">
        <span
          aria-hidden="true"
          className="text-tech-main/60 font-mono text-[10px] tracking-widest uppercase">
          {t("editorPrOwnershipLabel")}
        </span>
        <p className="text-tech-main text-sm leading-relaxed">
          {t("editorPrOwnershipBody")}
        </p>
      </section>
    </div>
  )
}
