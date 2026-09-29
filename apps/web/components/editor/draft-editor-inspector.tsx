"use client"

import { useTranslations } from "next-intl"
import { GitPullRequestIcon } from "lucide-react"
import { Button } from "@/components/ui/shadcn/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/shadcn/sheet"
import { DraftEditorReview } from "@/components/editor/draft-editor-review"
import type { DraftChangeEntry } from "@/components/editor/draft-editor-review"

interface DraftEditorInspectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeTab: "changes" | "guide"
  onSelectTab: (tab: "changes" | "guide") => void
  changeEntries: DraftChangeEntry[]
  contributingGuides: Array<{ id: string; title: string; content: string }>
  folders: string[]
  selectedGuideId: string
  onSelectGuide: (guideId: string) => void
  isReadOnly: boolean
  title: string
  hasMissingFilePath: boolean
  duplicateFilePaths: string[]
  isSubmitting: boolean
  submitDisabled: boolean
  onSubmit: () => void
}

export function DraftEditorInspector({
  open,
  onOpenChange,
  activeTab,
  onSelectTab,
  changeEntries,
  contributingGuides,
  folders,
  selectedGuideId,
  onSelectGuide,
  isReadOnly,
  title,
  hasMissingFilePath,
  duplicateFilePaths,
  isSubmitting,
  submitDisabled,
  onSubmit,
}: DraftEditorInspectorProps) {
  const t = useTranslations("Editor")
  const progressT = useTranslations("OperationProgress")
  const showsSubmission = activeTab === "changes" && !isReadOnly

  const submissionIssues = [
    ...(!title.trim() ? [t("titleRequired")] : []),
    ...(hasMissingFilePath ? [t("badgeAllFilesNeedPath")] : []),
    ...(duplicateFilePaths.length
      ? [t("duplicatePathsError", { paths: duplicateFilePaths.join(", ") })]
      : []),
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-surface-modal w-full gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <SheetHeader className="border-tech-main/20 border-b p-5 pr-12">
          <SheetTitle>
            {activeTab === "changes" ? t("reviewAndSubmit") : t("writingGuide")}
          </SheetTitle>
          <SheetDescription>
            {activeTab === "changes"
              ? t("reviewDescription")
              : t("guideDescription")}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeTab === "guide" && <SyntaxHintsPanel />}
          <DraftEditorReview
            activeTab={activeTab}
            changeEntries={changeEntries}
            contributingGuides={contributingGuides}
            folders={folders}
            selectedGuideId={selectedGuideId}
            onSelectTab={onSelectTab}
            onSelectGuide={onSelectGuide}
          />
          {showsSubmission && <SubmissionLicenseNotice />}
        </div>
        {showsSubmission && (
          <div className="border-tech-main/25 space-y-3 border-t p-5">
            {submissionIssues.length > 0 && (
              <ul className="list-disc space-y-1 pl-4 text-sm text-amber-800 dark:text-amber-300">
                {submissionIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
            <p className="text-tech-main text-xs">{t("submitSavesChanges")}</p>
            <Button
              className="w-full"
              onClick={onSubmit}
              disabled={submitDisabled}
              aria-busy={isSubmitting}>
              <GitPullRequestIcon aria-hidden className="size-4" />
              {isSubmitting ? progressT("submitBusy") : t("openPr")}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function SyntaxHintsPanel() {
  const t = useTranslations("Editor")

  return (
    <section className="border-tech-main/20 space-y-2 border-b p-5 text-sm leading-relaxed">
      <h3 className="font-semibold">{t("syntaxHintsTitle")}</h3>
      <p>{t("syntaxHintsDescription")}</p>
      <p>{t("syntaxHintsShortcut")}</p>
    </section>
  )
}

function SubmissionLicenseNotice() {
  const t = useTranslations("Editor")

  return (
    <section
      aria-label={t("submissionLicenseAria")}
      className="border-tech-main/20 space-y-2 border-t p-5 text-sm leading-relaxed">
      <h3 className="font-semibold">{t("submissionLicenseTitle")}</h3>
      <p>{t("submissionLicenseIntro")}</p>
      <p>
        {t("submissionLicenseReusePrefix")}{" "}
        <a
          className="underline underline-offset-4"
          href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
          target="_blank"
          rel="noopener noreferrer">
          CC BY-NC-SA 4.0
        </a>
        {t("submissionLicenseReuseSuffix")}
      </p>
      <p>{t("submissionLicenseAttribution")}</p>
    </section>
  )
}
