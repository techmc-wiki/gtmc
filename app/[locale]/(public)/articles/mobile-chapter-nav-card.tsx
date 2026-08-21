"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/shadcn/dialog"

interface MobileChapterNavCardProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  isFloating?: boolean
}

export function MobileChapterNavCard({
  isOpen,
  onClose,
  children,
  isFloating,
}: MobileChapterNavCardProps) {
  const t = useTranslations("CommonA11y")
  const tNav = useTranslations("ChapterNav")
  const isModalOpen = isOpen && isFloating

  return (
    <Dialog
      open={isModalOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}>
      <DialogContent
        showCloseButton={false}
        className="border-tech-main/40 bg-surface-overlay/95 left-1/2 top-1/2 max-h-[calc(100dvh-6rem)] w-[calc(100dvw-4rem)] max-w-[24rem] -translate-x-1/2 -translate-y-1/2 border backdrop-blur-md md:hidden"
        data-testid="mobile-tree-card">
        <CornerBrackets />

        <div
          className="z-20 flex h-10/12 shrink-0 items-center justify-between border-b border-tech-main/40 px-4"
          data-testid="mobile-tree-card-header">
          <DialogTitle className="flex items-center gap-2 font-mono text-xs font-bold tracking-tech-wide text-tech-main/60 uppercase">
            <span className="size-1.5 animate-pulse bg-tech-main/60" />
            {tNav("title")}
          </DialogTitle>
          <button
            onClick={onClose}
            className="cursor-pointer px-3 py-2 font-mono text-xs font-bold tracking-[0.15em] text-tech-main uppercase transition-colors hover:bg-tech-main/10"
            data-testid="mobile-tree-card-close"
            aria-label={t("closeTree")}>
            {tNav("buttonClose")}
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
