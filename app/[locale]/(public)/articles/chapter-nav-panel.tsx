import { useTranslations } from "next-intl"
import { usePathname } from "@/i18n/navigation"
import { ChapterNavToolbar } from "./chapter-nav/chapter-nav-toolbar"
import { ChapterNavTree } from "./chapter-nav/tree"
import { useReaderNavigation } from "./reader-navigation/context"
import { useScrollToActive } from "./chapter-nav/use-scroll-to-active"

interface ChapterNavPanelProps {
  onNavigate?: () => void
  className?: string
}

export function ChapterNavPanel({
  onNavigate,
  className = "",
}: ChapterNavPanelProps) {
  const t = useTranslations("ChapterNav")
  const pathname = usePathname()
  const {
    tree,
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

  const { scrollToCurrent } = useScrollToActive({
    tree,
    pathname,
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
        onLocate={scrollToCurrent}
      />
      <div
        ref={scrollContainerRef}
        className={`reader-rail-scrollbar min-h-0 flex-1 overflow-y-auto pt-2 pb-4 ${className}`}>
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
