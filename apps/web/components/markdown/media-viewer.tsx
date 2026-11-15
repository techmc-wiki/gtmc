"use client"

import { X } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ReactElement, ReactNode } from "react"

import { Button } from "@/components/ui/shadcn/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/shadcn/dialog"

export function MediaViewer({
  title,
  trigger,
  children,
}: {
  title: string
  trigger: ReactElement
  children: ReactNode
}) {
  const t = useTranslations("CommonA11y")

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="bg-surface fixed top-1/2 left-1/2 w-[min(96vw,90rem)] -translate-x-1/2 -translate-y-1/2 p-3 sm:p-5">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-11"
            aria-label={t("closeViewer")}>
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
        {children}
      </DialogContent>
    </Dialog>
  )
}
