"use client"

import {
  PenLineIcon,
  Columns2Icon,
  EyeIcon,
  GitPullRequestIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { TabsList, TabsTrigger } from "@/components/ui/shadcn/tabs"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/shadcn/tooltip"
import { IconButton } from "@/components/ui/icon-button"
import { cn } from "@/lib/cn"

export function DraftEditorModeBar({
  onOpenChanges,
}: {
  onOpenChanges: () => void
}) {
  const t = useTranslations("Editor")

  const modes = [
    { value: "write", label: t("writeTab"), icon: PenLineIcon },
    { value: "split", label: t("splitView"), icon: Columns2Icon },
    { value: "preview", label: t("previewTab"), icon: EyeIcon },
  ]

  return (
    <>
      <TabsList aria-label={t("editorModeAria")} className="gap-0">
        {modes.map(({ value, label, icon: Icon }) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <TabsTrigger
                value={value}
                aria-label={label}
                className={cn(
                  "size-11 border-0 bg-transparent p-0 shadow-none data-[state=active]:bg-tech-main/10 data-[state=active]:text-tech-main-dark data-[state=active]:shadow-[inset_0_-2px_0_var(--color-tech-signal)]",
                  value === "split" && "hidden md:flex"
                )}>
                <Icon aria-hidden className="size-4" />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </TabsList>
      <IconButton label={t("reviewChanges")} onClick={onOpenChanges}>
        <GitPullRequestIcon aria-hidden />
      </IconButton>
    </>
  )
}
