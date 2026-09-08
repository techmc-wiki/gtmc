import { useTranslations } from "next-intl"
import { FoldVertical, LocateFixed } from "lucide-react"
import { Button } from "@/components/ui/shadcn/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/shadcn/tooltip"

export function ChapterNavToolbar({
  onCollapseAll,
  onLocate,
}: {
  onCollapseAll: () => void
  onLocate: () => void
}) {
  const t = useTranslations("ChapterNav")

  return (
    <div className="ml-auto flex shrink-0 items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:size-8"
            aria-label={t("buttonCollapseAll")}
            onClick={onCollapseAll}>
            <FoldVertical aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("buttonCollapseAll")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:size-8"
            aria-label={t("buttonLocate")}
            onClick={onLocate}>
            <LocateFixed aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("buttonLocate")}</TooltipContent>
      </Tooltip>
    </div>
  )
}
