"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { ExternalLink, Info, UserCheck } from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/shadcn/card"
import { cn } from "@/lib/cn"

const DEFAULT_GLOSSARY_REPO_URL =
  "https://github.com/TechMC-Glossary/TechMC-Glossary"

export interface ComplexChangesNoticeProps {
  repoUrl?: string
  className?: string
}

export function ComplexChangesNotice({
  repoUrl = DEFAULT_GLOSSARY_REPO_URL,
  className,
}: ComplexChangesNoticeProps) {
  const t = useTranslations("Glossary")

  const repoLinkTag = React.useCallback(
    (chunks: React.ReactNode) => (
      <a
        href={repoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground hover:text-tech-signal inline-flex items-center gap-0.5 font-medium underline decoration-dotted underline-offset-4">
        {chunks}
        <ExternalLink className="ml-0.5 size-3" />
      </a>
    ),
    [repoUrl]
  )

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-none border border-border/60 bg-surface/50 p-3.5 text-xs text-muted-foreground leading-relaxed",
        className
      )}>
      <Info className="text-tech-signal mt-0.5 size-4 shrink-0" />
      <div>
        {t.rich("editorComplexChangesBody", {
          repoLink: repoLinkTag,
        })}
      </div>
    </div>
  )
}

export interface AttributionWarningProps {
  authorName: string
  githubNoreplyEmail: string
  realEmail: string | null
  useRealEmail: boolean
  onUseRealEmailChange: (value: boolean) => void
  className?: string
}

export function AttributionWarning({
  authorName,
  githubNoreplyEmail,
  realEmail,
  useRealEmail,
  onUseRealEmailChange,
  className,
}: AttributionWarningProps) {
  const t = useTranslations("Glossary")

  const canToggleRealEmail = Boolean(
    realEmail && realEmail !== githubNoreplyEmail
  )
  const displayedEmail =
    canToggleRealEmail && useRealEmail ? realEmail : githubNoreplyEmail

  const authorNameTag = React.useCallback(
    (chunks: React.ReactNode) => (
      <strong className="text-foreground font-semibold">{chunks}</strong>
    ),
    []
  )

  const authorEmailTag = React.useCallback(
    (chunks: React.ReactNode) => (
      <span className="text-foreground font-mono text-[11px]">
        &lt;{chunks}&gt;
      </span>
    ),
    []
  )

  return (
    <Card
      tone="main"
      borderOpacity="subtle"
      background="default"
      padding="compact"
      brackets="hidden"
      hover="none"
      className={cn("border-border", className)}>
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
          <UserCheck className="text-tech-signal size-3.5" />
          {t("editorAttributionLabel").replaceAll("[", "").replaceAll("]", "")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-0">
        <p className="text-muted-foreground text-xs leading-relaxed">
          {t.rich("editorAttributionBody", {
            name: authorName,
            email: displayedEmail || githubNoreplyEmail || "",
            authorName: authorNameTag,
            authorEmail: authorEmailTag,
          })}
        </p>

        {canToggleRealEmail && (
          <label
            htmlFor="attribution-real-email-input"
            className="text-foreground border-border/40 flex cursor-pointer items-center gap-2 border-t pt-1 text-xs">
            <input
              id="attribution-real-email-input"
              type="checkbox"
              checked={useRealEmail}
              onChange={(e) => onUseRealEmailChange(e.target.checked)}
              className="accent-tech-signal size-3.5 cursor-pointer"
            />
            <span>{t("editorRealEmailToggleLabel")}</span>
          </label>
        )}
      </CardContent>
    </Card>
  )
}
