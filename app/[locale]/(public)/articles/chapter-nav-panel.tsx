import { useTranslations } from "next-intl"
import { FoldVertical, LocateFixed } from "lucide-react"
import { Button } from "@/components/ui/shadcn/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/shadcn/tooltip"
import { ChapterNavTree } from "./chapter-nav/tree"
import { useLocateCurrent } from "./chapter-nav/use-locate-current"
import { useReaderNavigation } from "./reader-navigation/context"

interface ChapterNavPanelProps {
  showTitle?: boolean
  onNavigate?: () => void
  scrollClassName?: string
}

export function ChapterNavPanel({
  onNavigate,
  showTitle = false,
  scrollClassName = "",
}: ChapterNavPanelProps) {
  const t = useTranslations("ChapterNav")
  const {
    tree,
    effectivePath,
    setExpandedFolders,
    expandedFoldersRef,
    mounted,
    setHighlightActive,
    scrollContainerRef,
    collapseAll,
    activeItemRef,
    folderGridRefs,
  } = useReaderNavigation()

  const locateCurrent = useLocateCurrent({
    tree,
    effectivePath,
    mounted,
    expandedFoldersRef,
    setExpandedFolders,
    scrollContainerRef,
    activeItemRef,
    folderGridRefs,
    setHighlightActive,
  })

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b pb-1">
        {showTitle && <h2 className="min-w-0 text-sm font-semibold">{t("title")}</h2>}
        <ChapterNavToolbar onCollapseAll={collapseAll} onLocate={locateCurrent} />
      </div>
      <div
        ref={scrollContainerRef}
        className={`reader-rail-scrollbar min-h-0 flex-1 overflow-y-auto pt-2 pb-4 ${scrollClassName}`}>
        {tree.length === 0 ? (
          <div className="mt-4 text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <ChapterNavTree onNavigate={onNavigate} items={tree} />
        )}
      </div>
    </div>
  )
}

function ChapterNavToolbar({
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
