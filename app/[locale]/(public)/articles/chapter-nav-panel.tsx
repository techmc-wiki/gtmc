import { useTranslations } from "next-intl"
import { ChapterNavToolbar } from "./chapter-nav/chapter-nav-toolbar"
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
    expandedFolders,
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
    expandedFolders,
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
