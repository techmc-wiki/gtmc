import { useTranslations } from "next-intl"
import { ChapterNavToolbar } from "./chapter-nav/chapter-nav-toolbar"
import { ChapterNavTree } from "./chapter-nav/tree"
import { useLocateCurrent } from "./chapter-nav/use-locate-current"
import { useReaderNavigation } from "./reader-navigation/context"

interface ChapterNavPanelProps {
  onNavigate?: () => void
  scrollClassName?: string
}

export function ChapterNavPanel({
  onNavigate,
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
      <ChapterNavToolbar
        onCollapseAll={collapseAll}
        onLocate={locateCurrent}
      />
      <div
        ref={scrollContainerRef}
        className={`reader-rail-scrollbar min-h-0 flex-1 overflow-y-auto pt-2 pb-4 ${scrollClassName}`}>
        {tree.length === 0 ? (
          <div className="mt-4 font-mono text-sm text-tech-main/40">
            {t("empty")}
          </div>
        ) : (
          <ChapterNavTree onNavigate={onNavigate} items={tree} />
        )}
      </div>
    </div>
  )
}
