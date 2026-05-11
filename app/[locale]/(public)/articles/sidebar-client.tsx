import * as React from "react"
import { useImperativeHandle } from "react"
import { usePathname } from "@/i18n/navigation"
import { SidebarActions } from "./sidebar/actions"
import { SidebarTree, type TreeNode } from "./sidebar/tree-node"
import { useBlur } from "./sidebar/use-blur"
import { useSidebarContext } from "./sidebar/sidebar-context"
import { useScrollToActive } from "./sidebar/use-scroll-to-active"

export interface SidebarClientHandle {
  openCreateModal: () => void
  collapseAll: () => void
  scrollToCurrent: () => void
}

interface SidebarClientProps {
  tree: TreeNode[]
  onNavigate?: () => void
  internalScroll?: boolean
  scrollClass?: string
  hideActions?: boolean
}

export const SidebarClient = React.forwardRef<
  SidebarClientHandle,
  SidebarClientProps
>(function SidebarClient(
  {
    tree: _tree,
    onNavigate,
    internalScroll = false,
    scrollClass = "",
    hideActions = false,
  },
  ref
) {
  void _tree

  return (
    <SidebarClientInner
      onNavigate={onNavigate}
      internalScroll={internalScroll}
      scrollClass={scrollClass}
      hideActions={hideActions}
      ref={ref}
    />
  )
})

const SidebarClientInner = React.forwardRef<
  SidebarClientHandle,
  Omit<SidebarClientProps, "tree">
>(function SidebarClientInner(
  { onNavigate, internalScroll = false, scrollClass = "", hideActions = false },
  ref
) {
  const pathname = usePathname()

  const {
    tree,
    expandedFolders,
    setExpandedFolders,
    expandedFoldersRef,
    mounted,
    toc,
    highlightActive,
    setHighlightActive,
    scrollContainerRef,
    collapseAll,
    scrollToCurrent,
    setScrollToCurrent,
    activeItemRef,
    folderGridRefs,
  } = useSidebarContext()

  const {
    scrollToCurrent: scrollToCurrentFn,
    highlightActive: highlightActiveFromScroll,
  } = useScrollToActive({
    tree,
    pathname,
    mounted,
    expandedFolders,
    expandedFoldersRef,
    setExpandedFolders,
    scrollContainerRef,
    activeItemRef,
    folderGridRefs,
  })

  React.useEffect(() => {
    setScrollToCurrent(scrollToCurrentFn)
  }, [scrollToCurrentFn, setScrollToCurrent])

  React.useEffect(() => {
    setHighlightActive(highlightActiveFromScroll)
  }, [highlightActiveFromScroll, setHighlightActive])

  useBlur({
    internalScroll,
    scrollContainerRef,
    pathname,
    tree,
    expandedFolders,
    toc,
    highlightActive,
  })

  useImperativeHandle(ref, () => ({
    openCreateModal: () => {},
    collapseAll,
    scrollToCurrent,
  }))

  const treeContent =
    tree.length === 0 ? (
      <div className="mt-4 font-mono text-sm text-tech-main/40">
        SYS.DIR_TREE_EMPTY
      </div>
    ) : (
      <SidebarTree onNavigate={onNavigate} items={tree} />
    )

  return (
    <>
      {internalScroll ? (
        <div className="relative flex min-h-0 flex-1 flex-col">
          {!hideActions && (
            <SidebarActions
              internalScroll={internalScroll}
              onCollapseAll={(e) => {
                e.preventDefault()
                collapseAll()
              }}
              onLocate={scrollToCurrent}
            />
          )}
          <div
            ref={scrollContainerRef}
            className={`
              custom-left-scrollbar min-h-0 flex-1 overflow-y-auto pb-12
              ${scrollClass}
            `}>
            {treeContent}
          </div>
          <div
            className="
              pointer-events-none absolute inset-x-0 bottom-0 z-20 -mr-4 -mb-2
              hidden h-12 mask-[linear-gradient(to_bottom,transparent,black)]
              [-webkit-mask-image:linear-gradient(to_bottom,transparent,black)]
              sm:block
            "
            style={{
              background:
                "repeating-linear-gradient(45deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 4px), linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.4) 100%)",
            }}
          />
        </div>
      ) : (
        <>
          {!hideActions && (
            <SidebarActions
              internalScroll={internalScroll}
              onCollapseAll={(e) => {
                e.preventDefault()
                collapseAll()
              }}
              onLocate={scrollToCurrent}
            />
          )}
          {treeContent}
        </>
      )}
    </>
  )
})
