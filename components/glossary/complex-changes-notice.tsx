import * as React from "react"
import { useTranslations } from "next-intl"
import { TechCard } from "@/components/ui/tech-card"
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
        className="text-tech-accent hover:text-tech-accent/80 underline decoration-dotted underline-offset-4 transition-colors">
        {chunks}
      </a>
    ),
    [repoUrl]
  )

  return (
    <TechCard
      tone="main"
      borderOpacity="muted"
      background="ghost"
      padding="compact"
      brackets="hidden"
      hover="none"
      className={cn("border-tech-main/40 bg-tech-bg/50 border-l-2", className)}>
      <div className="flex flex-col gap-2">
        <span
          aria-hidden="true"
          className="text-tech-main/60 font-mono text-[10px] tracking-widest uppercase">
          {t("editorComplexChangesLabel")}
        </span>
        <p className="text-tech-main text-sm leading-relaxed">
          {t.rich("editorComplexChangesBody", {
            repoLink: repoLinkTag,
          })}
        </p>
      </div>
    </TechCard>
  )
}
