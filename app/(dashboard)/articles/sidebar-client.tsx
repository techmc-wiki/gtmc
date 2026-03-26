"use client"

import * as React from "react"
import { useMemo, useImperativeHandle } from "react"
import { usePathname, useRouter } from "next/navigation"
import { SidebarActions } from "./sidebar/actions"
import { CreateDocModal } from "./sidebar/create-doc-modal"
import { SidebarTree, type TreeNode } from "./sidebar/tree-node"
import { useBlur } from "./sidebar/use-blur"
import { useExpandedFolders } from "./sidebar/use-expanded-folders"
import { useScrollToActive } from "./sidebar/use-scroll-to-active"
import { useToc } from "./sidebar/use-toc"

export interface SidebarClientHandle {
  openCreateModal: () => void
  collapseAll: (e: React.MouseEvent) => void
  scrollToCurrent: () => void
}

function flattenFolders(items: TreeNode[]): TreeNode[] {
  let folders: TreeNode[] = []
  items.forEach((item) => {
    if (item.isFolder) {
      folders.push(item)
      if (item.children)
        folders = [...folders, ...flattenFolders(item.children)]
    }
  })
  return folders
}

export const SidebarClient = React.forwardRef<
  SidebarClientHandle,
  {
    tree: TreeNode[]
    onNavigate?: () => void
    internalScroll?: boolean
    scrollClass?: string
    hideActions?: boolean
  }
>(function SidebarClient(
  {
    tree,
    onNavigate,
    internalScroll = false,
    scrollClass = "",
    hideActions = false,
  },
  ref
) {
  const pathname = usePathname()
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isFileExpanded, setIsFileExpanded] = React.useState(false)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  const {
    expandedFolders,
    setExpandedFolders,
    expandedFoldersRef,
    mounted,
    isFolderExpanded,
  } = useExpandedFolders()
  const toc = useToc(pathname)

  React.useEffect(() => {
    setIsFileExpanded(true)
  }, [pathname])

  const toggleFileExp = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsFileExpanded((prev) => !prev)
  }

  const toggleFolder = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const collapseAll = React.useCallback(
    (e: React.MouseEvent) => {
      setExpandedFolders(new Set())
      setIsFileExpanded(false)
    },
    [setExpandedFolders, setIsFileExpanded]
  )

  const {
    activeItemRef,
    folderGridRefs,
    highlightActive,
    getEffectivePathname,
    scrollToCurrent,
  } = useScrollToActive({
    tree,
    pathname,
    mounted,
    expandedFolders,
    expandedFoldersRef,
    setExpandedFolders,
    scrollContainerRef,
    setIsFileExpanded,
  })

  useBlur({
    internalScroll,
    scrollContainerRef,
    pathname,
    tree,
    expandedFolders,
    toc,
    isFileExpanded,
    highlightActive,
  })

  useImperativeHandle(ref, () => ({
    openCreateModal: () => setIsModalOpen(true),
    collapseAll,
    scrollToCurrent,
  }))

  const availableFolders = useMemo(() => flattenFolders(tree), [tree])
  const effectivePath = getEffectivePathname()

  return (
    <>
      {internalScroll ? (
        <div className="relative flex min-h-0 flex-1 flex-col">
          {!hideActions && (
            <SidebarActions
              internalScroll={internalScroll}
              onCreate={() => setIsModalOpen(true)}
              onCollapseAll={collapseAll}
              onLocate={scrollToCurrent}
            />
          )}
          <div
            ref={scrollContainerRef}
            className={`
              custom-left-scrollbar min-h-0 flex-1 overflow-y-auto
              ${scrollClass}
            `}>
            {tree.length === 0 ? (
              <div className="mt-4 font-mono text-sm text-tech-main/40">
                SYS.DIR_TREE_EMPTY
              </div>
            ) : (
              <SidebarTree
                items={tree}
                effectivePath={effectivePath}
                isFileExpanded={isFileExpanded}
                toc={toc}
                isFolderExpanded={isFolderExpanded}
                toggleFolder={toggleFolder}
                toggleFileExp={toggleFileExp}
                onNavigate={onNavigate}
                setIsFileExpanded={setIsFileExpanded}
                highlightActive={highlightActive}
                activeItemRef={activeItemRef}
                folderGridRefs={folderGridRefs}
              />
            )}
          </div>
          <div
            className="
              pointer-events-none absolute inset-x-0 bottom-0 z-20 -mr-4 -mb-2
              h-12 mask-[linear-gradient(to_bottom,transparent,black)]
              [-webkit-mask-image:linear-gradient(to_bottom,transparent,black)]
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
              onCreate={() => setIsModalOpen(true)}
              onCollapseAll={collapseAll}
              onLocate={scrollToCurrent}
            />
          )}
          {tree.length === 0 ? (
            <div className="mt-4 font-mono text-sm text-tech-main/40">
              SYS.DIR_TREE_EMPTY
            </div>
          ) : (
            <SidebarTree
              items={tree}
              effectivePath={effectivePath}
              isFileExpanded={isFileExpanded}
              toc={toc}
              isFolderExpanded={isFolderExpanded}
              toggleFolder={toggleFolder}
              toggleFileExp={toggleFileExp}
              onNavigate={onNavigate}
              setIsFileExpanded={setIsFileExpanded}
              highlightActive={highlightActive}
              activeItemRef={activeItemRef}
              folderGridRefs={folderGridRefs}
            />
          )}
        </>
      )}

      <CreateDocModal
        open={isModalOpen}
        mounted={mounted}
        availableFolders={availableFolders}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => router.refresh()}
      />
    </>
  )
})
