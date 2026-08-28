"use client"

import { useTranslations } from "next-intl"
import { LazyMarkdownPreview } from "@/components/editor/lazy-markdown-preview"
import { Button } from "@/components/ui/shadcn/button"
import type { DraftFileRecord } from "@/lib/drafts/files"

export interface DraftDiffRow {
  newLine: number | null
  oldLine: number | null
  type: "add" | "context" | "remove" | "skipped"
  value: string
}

export interface DraftChangeEntry {
  changeType: "modified" | "new" | "pending"
  file: DraftFileRecord
  rows: DraftDiffRow[]
}

interface DraftEditorReviewProps {
  activeTab: "changes" | "guide"
  changeEntries: DraftChangeEntry[]
  contributingGuides: Array<{ id: string; title: string; content: string }>
  folders: string[]
  onSelectGuide: (guideId: string) => void
  onSelectTab: (tab: "changes" | "guide") => void
  selectedGuideId: string
}

export function DraftEditorReview({
  activeTab,
  changeEntries,
  contributingGuides,
  folders,
  onSelectGuide,
  onSelectTab,
  selectedGuideId,
}: DraftEditorReviewProps) {
  const t = useTranslations("Editor")
  const newFolderPaths = folders

  return (
    <section className="border-tech-main/35 bg-surface-overlay/80 border backdrop-blur-sm">
      <div
        className="guide-line flex border-b"
        role="tablist"
        aria-label={t("reviewAria")}>
        <Button
          type="button"
          variant={activeTab === "changes" ? "primary" : "ghost"}
          size="sm"
          className="flex-1"
          aria-selected={activeTab === "changes"}
          onClick={() => onSelectTab("changes")}>
          {t("reviewChanges")}
        </Button>
        <Button
          type="button"
          variant={activeTab === "guide" ? "primary" : "ghost"}
          size="sm"
          className="flex-1"
          aria-selected={activeTab === "guide"}
          onClick={() => onSelectTab("guide")}>
          {t("contributingGuidance")}
        </Button>
      </div>

      {activeTab === "changes" ? (
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <ReviewStat
              label={t("modifiedFiles")}
              value={String(
                changeEntries.filter((entry) => entry.changeType === "modified")
                  .length
              )}
            />
            <ReviewStat
              label={t("newFiles")}
              value={String(
                changeEntries.filter((entry) => entry.changeType === "new")
                  .length
              )}
            />
            <ReviewStat
              label={t("newFolders")}
              value={String(folders.length)}
            />
          </div>

          {changeEntries.length === 0 ? (
            <p className="guide-line bg-tech-main/5 text-tech-main/60 border p-4 text-sm">
              {t("noChanges")}
            </p>
          ) : (
            <div className="space-y-4">
              {changeEntries.map((entry) => (
                <ChangePreviewCard
                  key={entry.file.id}
                  filePath={entry.file.filePath || t("targetFileUnset")}
                  changeType={entry.changeType}
                  rows={entry.rows}
                />
              ))}
            </div>
          )}

          {newFolderPaths.length > 0 ? (
            <div className="guide-line bg-tech-main/5 border p-4">
              <p className="text-tech-main/60 text-xs font-medium">
                {t("newFolders")}
              </p>
              <div className="mt-2 space-y-1 font-mono text-xs text-emerald-700">
                {newFolderPaths.map((folderPath) => (
                  <p key={folderPath}>+ {folderPath}</p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="p-4">
          {contributingGuides.length === 0 ? (
            <p className="text-tech-main/60 text-sm">{t("noGuides")}</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {contributingGuides.map((guide) => (
                  <Button
                    key={guide.id}
                    type="button"
                    variant={
                      selectedGuideId === guide.id ? "primary" : "secondary"
                    }
                    size="sm"
                    onClick={() => onSelectGuide(guide.id)}>
                    {guide.title}
                  </Button>
                ))}
              </div>
              <div className="max-h-136 overflow-y-auto pr-2">
                <LazyMarkdownPreview
                  content={
                    contributingGuides.find(
                      (guide) => guide.id === selectedGuideId
                    )?.content || contributingGuides[0].content
                  }
                  rawPath="CONTRIBUTING.md"
                />
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}

function ReviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="guide-line bg-tech-main/5 border p-3">
      <p className="text-tech-main/60 text-xs font-medium">{label}</p>
      <p className="text-tech-main mt-2 font-mono text-lg">{value}</p>
    </div>
  )
}

function ChangePreviewCard({
  filePath,
  changeType,
  rows,
}: {
  filePath: string
  changeType: "modified" | "new" | "pending"
  rows: DraftDiffRow[]
}) {
  return (
    <section className="guide-line bg-surface-overlay/70 border">
      <div className="guide-line bg-tech-main/5 flex items-center justify-between border-b px-4 py-3">
        <p className="text-tech-main font-mono text-xs break-all">{filePath}</p>
        <span
          className={`border px-2 py-1 font-mono text-[0.625rem] ${
            changeType === "new"
              ? "border-emerald-500/30 text-emerald-700"
              : changeType === "modified"
                ? "border-amber-500/30 text-amber-700"
                : "guide-line text-tech-main/55"
          }`}>
          {changeType}
        </span>
      </div>
      <div className="max-h-72 overflow-auto bg-slate-950/95 font-mono text-[0.6875rem] text-slate-100">
        {rows.map((row) => (
          <div
            key={`${filePath}:${row.oldLine ?? "x"}:${row.newLine ?? "x"}:${row.type}`}
            className={`grid grid-cols-[3rem_3rem_minmax(0,1fr)] px-2 py-1 ${
              row.type === "add"
                ? "bg-emerald-500/10 text-emerald-200"
                : row.type === "remove"
                  ? "bg-red-500/10 text-red-200"
                  : row.type === "skipped"
                    ? "bg-slate-800/70 text-slate-400"
                    : "text-slate-300"
            }`}>
            <span className="text-slate-500">{row.oldLine ?? ""}</span>
            <span className="text-slate-500">{row.newLine ?? ""}</span>
            <span className="break-all whitespace-pre-wrap">
              {row.type === "skipped" ? `… ${row.value}` : row.value || " "}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
