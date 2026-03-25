"use client"

import * as React from "react"
import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createDocument } from "@/actions/sidebar"

interface TocItem {
  id: string
  text: string
}

interface TreeNode {
  id: string
  title: string
  slug: string
  isFolder: boolean
  parentId: string | null
  children: TreeNode[]
}

export function SidebarClient({
  tree,
  onNavigate,
  internalScroll = false,
  scrollClass = "",
}: {
  tree: TreeNode[]
  onNavigate?: () => void
  internalScroll?: boolean
  scrollClass?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({
    title: "",
    slug: "",
    isFolder: false,
    parentId: "",
  })

  const [toc, setToc] = useState<TocItem[]>([])
  const [isFileExpanded, setIsFileExpanded] = useState(false)

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  const [highlightActive, setHighlightActive] = useState(false)
  const activeItemRef = useRef<HTMLLIElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const blurFrameRef = useRef<number | null>(null)
  const folderGridRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const locatePendingRef = useRef(false)
  const pendingExpandIdsRef = useRef<string[]>([])
  const expandedFoldersRef = useRef(expandedFolders)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    expandedFoldersRef.current = expandedFolders
    if (mounted) {
      localStorage.setItem(
        "gtmc_sidebar_expanded",
        JSON.stringify(Array.from(expandedFolders))
      )
    }
  }, [expandedFolders, mounted])

  useEffect(() => {
    let frameCount = 0
    const maxFrames = 10
    const scanHeadings = () => {
      const headings = document.querySelectorAll("main h2")
      if (headings.length > 0) {
        const tocItems: TocItem[] = []
        headings.forEach((heading) => {
          if (heading.id && heading.textContent) {
            tocItems.push({
              id: heading.id,
              text: heading.textContent.replace(/^#\s*/, ""),
            })
          }
        })
        setToc(tocItems)
        return true
      }
      return false
    }
    const retryWithRAF = () => {
      if (scanHeadings()) return
      if (frameCount < maxFrames) {
        frameCount++
        requestAnimationFrame(retryWithRAF)
      }
    }
    retryWithRAF()
  }, [pathname])

  useEffect(() => {
    setIsFileExpanded(true)
  }, [pathname])

  const toggleFileExp = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsFileExpanded((prev) => !prev)
  }

  const isFolderExpanded = useCallback(
    (id: string) => {
      if (!mounted) return false
      return expandedFolders.has(id)
    },
    [expandedFolders, mounted]
  )

  const toggleFolder = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const collapseAll = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setExpandedFolders(new Set())
    setIsFileExpanded(false)
  }, [])

  const getEffectivePathname = useCallback(() => {
    if (
      pathname === "/articles" ||
      pathname === "/articles/" ||
      pathname === "/"
    )
      return "/articles/Preface"
    return pathname
  }, [pathname])

  const findItemAndParents = useCallback(
    (
      items: TreeNode[],
      target: string,
      parents: string[] = []
    ): { item: TreeNode | null; parentIds: string[] } => {
      const decodedTarget = decodeURIComponent(target)
      for (const item of items) {
        const slug = `/articles/${item.slug}`
        const decodedSlug = decodeURIComponent(slug)
        if (
          decodedSlug === decodedTarget ||
          `${decodedSlug}/` === decodedTarget
        )
          return { item, parentIds: parents }
        if (item.children?.length > 0) {
          const r = findItemAndParents(item.children, target, [
            ...parents,
            item.id,
          ])
          if (r.item) return r
        }
      }
      return { item: null, parentIds: [] }
    },
    []
  )

  const scrollActiveItem = useCallback(() => {
    const item = activeItemRef.current
    const container = scrollContainerRef.current
    if (!item) return
    if (container) {
      const ir = item.getBoundingClientRect()
      const cr = container.getBoundingClientRect()
      const top = ir.top - cr.top + container.scrollTop - cr.height / 4
      container.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
    } else {
      item.scrollIntoView({ block: "start", behavior: "smooth" })
    }
    setHighlightActive(true)
    setTimeout(() => setHighlightActive(false), 2000)
  }, [])

  const expandAndScroll = useCallback(
    (parentIds: string[]) => {
      const needExpand = parentIds.filter(
        (id) => !expandedFoldersRef.current.has(id)
      )
      if (needExpand.length === 0) {
        scrollActiveItem()
        return
      }
      setExpandedFolders((prev) => {
        const next = new Set(prev)
        needExpand.forEach((id) => next.add(id))
        return next
      })
      pendingExpandIdsRef.current = needExpand
      locatePendingRef.current = true
    },
    [scrollActiveItem]
  )

  useEffect(() => {
    if (!locatePendingRef.current) return
    const ids = pendingExpandIdsRef.current
    const allGrids = folderGridRefs.current
    const watchGrids = ids
      .map((id) => allGrids.get(id))
      .filter((el): el is HTMLDivElement => !!el)
    if (watchGrids.length === 0) {
      locatePendingRef.current = false
      scrollActiveItem()
      return
    }
    let remaining = watchGrids.length
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== "grid-template-rows") return
      remaining--
      if (remaining <= 0) {
        locatePendingRef.current = false
        pendingExpandIdsRef.current = []
        scrollActiveItem()
        watchGrids.forEach((el) =>
          el.removeEventListener("transitionend", onEnd)
        )
      }
    }
    watchGrids.forEach((el) => el.addEventListener("transitionend", onEnd))
    return () => {
      watchGrids.forEach((el) => el.removeEventListener("transitionend", onEnd))
    }
  }, [expandedFolders, scrollActiveItem])

  useEffect(() => {
    if (!mounted || tree.length === 0) return
    const { parentIds } = findItemAndParents(tree, getEffectivePathname())
    expandAndScroll(parentIds)
  }, [
    pathname,
    mounted,
    tree,
    findItemAndParents,
    getEffectivePathname,
    expandAndScroll,
  ])

  const syncBottomRowBlur = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const rows = container.querySelectorAll<HTMLElement>(
      'li[data-sidebar-row="1"]'
    )
    const blurZoneRect = container.getBoundingClientRect()
    const blurZoneHeight = 32
    const blurZoneTop = blurZoneRect.bottom - blurZoneHeight

    rows.forEach((row) => {
      const rowRect = row.getBoundingClientRect()
      const overlapTop = Math.max(rowRect.top, blurZoneTop)
      const overlapBottom = Math.min(rowRect.bottom, blurZoneRect.bottom)
      const overlapHeight = overlapBottom - overlapTop
      const distBottomLine = blurZoneRect.bottom - rowRect.top

      if (rowRect.y > blurZoneRect.bottom) {
        row.style.filter = `blur(3px)`
        row.style.opacity = `0.15`
        return
      }

      if (overlapHeight <= 0) {
        row.style.filter = ""
        row.style.opacity = ""
        return
      }

      const ratio = Math.min(
        1,
        rowRect.top > blurZoneTop - blurZoneHeight * 0.8 ?
          overlapHeight / blurZoneHeight :
          (1 - distBottomLine / rowRect.height) * 0.4,
      )
      const blur = 0.2 + ratio * 2.8
      const opacity = 1 - ratio * 0.85
      row.style.filter = `blur(${blur.toFixed(3)}px)`
      row.style.opacity = `${(opacity).toFixed(3)}`
    })
  }, [])

  const scheduleBottomRowBlurSync = useCallback(() => {
    if (blurFrameRef.current !== null) return
    blurFrameRef.current = window.requestAnimationFrame(() => {
      blurFrameRef.current = null
      syncBottomRowBlur()
    })
  }, [syncBottomRowBlur])

  useEffect(() => {
    if (!internalScroll) return
    const container = scrollContainerRef.current
    if (!container) return

    const onScroll = () => scheduleBottomRowBlurSync()
    const onResize = () => scheduleBottomRowBlurSync()

    container.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onResize)

    const resizeObserver = new ResizeObserver(() => {
      scheduleBottomRowBlurSync()
    })
    resizeObserver.observe(container)
    scheduleBottomRowBlurSync()

    return () => {
      container.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onResize)
      resizeObserver.disconnect()

      if (blurFrameRef.current !== null) {
        window.cancelAnimationFrame(blurFrameRef.current)
        blurFrameRef.current = null
      }

      const rows = container.querySelectorAll<HTMLElement>(
        'li[data-sidebar-row="1"]'
      )
      rows.forEach((row) => {
        row.style.filter = ""
        row.style.opacity = ""
      })
    }
  }, [internalScroll, scheduleBottomRowBlurSync])

  useEffect(() => {
    if (!internalScroll) return
    scheduleBottomRowBlurSync()
  }, [
    internalScroll,
    pathname,
    tree,
    expandedFolders,
    toc,
    isFileExpanded,
    highlightActive,
    scheduleBottomRowBlurSync,
  ])

  const scrollToCurrent = useCallback(() => {
    console.log("[LOCATE] scrollToCurrent called")
    console.log("[LOCATE] window.scrollY:", window.scrollY)
    console.log("[LOCATE] window.innerHeight:", window.innerHeight)
    console.log("[LOCATE] window.innerHeight / 2:", window.innerHeight / 2)
    console.log(
      "[LOCATE] Should expand TOC?",
      window.scrollY >= window.innerHeight / 2
    )
    const { parentIds } = findItemAndParents(tree, getEffectivePathname())
    if (window.scrollY >= window.innerHeight / 2) {
      console.log("[LOCATE] Expanding TOC (setIsFileExpanded(true))")
      setIsFileExpanded(true)
    }
    expandAndScroll(parentIds)
  }, [tree, findItemAndParents, getEffectivePathname, expandAndScroll])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createDocument({
        title: formData.title,
        slug:
          formData.slug || formData.title.toLowerCase().replace(/\s+/g, "-"),
        isFolder: formData.isFolder,
        parentId: formData.parentId || null,
      })
      setIsModalOpen(false)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      alert(message)
    }
  }

  const renderTree = (items: TreeNode[], level = 0) => {
    const effectivePath = getEffectivePathname()
    const decodedPathname = decodeURIComponent(effectivePath)
    return (
      <ul className="my-1 pl-6">
        {items.map((item) => {
          const fileRoute = `/articles/${item.slug.split("/").map(encodeURIComponent).join("/")}`
          const decodedRoute = decodeURIComponent(fileRoute)
          const isActive =
            !item.isFolder &&
            (decodedPathname === decodedRoute ||
              decodedPathname === `${decodedRoute}/`)

          const folderExpanded = item.isFolder
            ? isFolderExpanded(item.id)
            : false

          return (
            <li
              key={item.id}
              data-sidebar-row="1"
              ref={!item.isFolder && isActive ? activeItemRef : undefined}
              className={`
                relative my-1.5 w-fit list-none font-mono text-[16px]
                transition-all duration-300
                md:text-base
                ${!item.isFolder && isActive && highlightActive
                  ? `bg-tech-main/10 px-1 py-0.5`
                  : ""
                }
              `}>
              {!item.isFolder && isActive && highlightActive && (
                <div>
                  <div
                    className="
                      pointer-events-none absolute top-0 left-0 size-2
                      -translate-px border-t-2 border-l-2 border-tech-main/40
                    "
                  />
                  <div
                    className="
                      pointer-events-none absolute top-0 right-0.5 size-2
                      translate-x-px -translate-y-px border-t-2 border-r-2
                      border-tech-main/40
                    "
                  />
                  <div
                    className="
                      pointer-events-none absolute bottom-0 left-0 size-2
                      -translate-x-px translate-y-px border-b-2 border-l-2
                      border-tech-main/40
                    "
                  />
                  <div
                    className="
                      pointer-events-none absolute right-0.5 bottom-0 size-2
                      translate-px border-r-2 border-b-2 border-tech-main/40
                    "
                  />
                </div>
              )}
              {item.isFolder ? (
                <button
                  onClick={(e) => toggleFolder(item.id, e)}
                  className="
                    mt-3 mb-1 flex w-fit cursor-pointer items-center text-left
                    font-bold text-tech-main/80 uppercase opacity-80
                    transition-colors
                    hover:text-tech-main
                    focus:outline-none
                  ">
                  <span className="inline-block w-4 text-xs text-tech-main/50">
                    {folderExpanded ? "▼" : "▶"}
                  </span>
                  <span>{item.title}</span>
                </button>
              ) : (
                <div className="relative">
                  <div
                    className={`
                      group relative -ml-4 flex items-center py-1.5 pl-4
                      transition-colors
                      ${isActive
                        ? `font-bold text-tech-main`
                        : `
                          text-slate-700
                          hover:text-tech-main
                        `
                      }
                    `}>
                    {isActive && toc.length > 0 ? (
                      <button
                        onClick={toggleFileExp}
                        className="
                          absolute top-1/2 left-0 z-10 -translate-y-1/2
                          cursor-pointer text-[10px] text-tech-main
                          transition-opacity
                          hover:text-tech-main/80
                          focus:outline-none
                          md:text-xs
                        "
                        title={isFileExpanded ? "收起目录" : "展开目录"}>
                        {isFileExpanded ? "▼" : "▶"}
                      </button>
                    ) : (
                      <span
                        className={`
                          absolute top-1/2 left-0 -translate-y-1/2 text-xs
                          transition-opacity
                          md:text-sm
                          ${isActive
                            ? `text-tech-main opacity-100`
                            : `
                              text-tech-main opacity-0
                              group-hover:opacity-100
                            `
                          }
                        `}>
                        &gt;
                      </span>
                    )}
                    <Link
                      href={fileRoute}
                      onClick={(e) => {
                        if (isActive) {
                          e.preventDefault()
                          setIsFileExpanded((prev) => !prev)
                        } else {
                          onNavigate?.()
                        }
                      }}
                      className={`
                        block w-full border-b pb-px pl-1
                        ${isActive
                          ? `cursor-pointer border-tech-main/50`
                          : `
                            border-transparent
                            group-hover:border-tech-main/30
                          `
                        }
                      `}>
                      {item.title}
                    </Link>
                  </div>
                  {/* 二级标题展示（三级目录） */}
                  {isActive && toc.length > 0 && (
                    <div
                      className={`
                        grid transition-all duration-300 ease-out
                        ${isFileExpanded
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                        }
                      `}>
                      <div className="overflow-hidden">
                        <ul
                          className="
                            mt-1 mb-2 ml-1 space-y-2 border-l guide-line pl-4
                          ">
                          {toc.map((h2) => (
                            <li
                              key={h2.id}
                              className="
                                relative text-[13px] text-tech-main/70
                                transition-colors
                                before:absolute before:top-1/2 before:-left-4
                                before:h-px before:w-2 before:-translate-y-1/2
                                before:bg-tech-main/30 before:content-['']
                                hover:text-tech-main
                                md:text-sm
                              ">
                              <Link
                                href={`#${h2.id}`}
                                onClick={() => onNavigate?.()}
                                className="block wrap-break-word">
                                {h2.text}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {item.children && item.children.length > 0 && (
                <div
                  ref={(el) => {
                    if (el) folderGridRefs.current.set(item.id, el)
                    else folderGridRefs.current.delete(item.id)
                  }}
                  className={`
                    grid transition-all duration-300 ease-out
                    ${!item.isFolder || folderExpanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                    }
                  `}>
                  <div className="overflow-hidden">
                    {renderTree(item.children, level + 1)}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  const flattenFolders = useCallback((items: TreeNode[]): TreeNode[] => {
    let folders: TreeNode[] = []
    items.forEach((item) => {
      if (item.isFolder) {
        folders.push(item)
        if (item.children)
          folders = [...folders, ...flattenFolders(item.children)]
      }
    })
    return folders
  }, [])

  const availableFolders = useMemo(
    () => flattenFolders(tree),
    [tree, flattenFolders]
  )

  const buttonsPanel = (
    <div
      className="
        ml-0.5 shrink-0 border-b guide-line bg-white/95 px-6 py-3
        backdrop-blur-sm
      ">
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setIsModalOpen(true)}
          className="
            cursor-pointer border border-tech-main/40 px-3 py-1.5 pl-2 font-mono
            text-[11px] transition-colors
            hover:bg-tech-main hover:text-white
          ">
          + NEW DIR / FILE
        </button>
        <div className="flex gap-2">
          <button
            onClick={collapseAll}
            className="
              flex-3 cursor-pointer border border-tech-main/40 px-3 py-1.5 pl-2
              font-mono text-[11px] transition-colors
              hover:bg-tech-main hover:text-white
            ">
            ⊟ COLLAPSE ALL
          </button>
          <button
            onClick={scrollToCurrent}
            className="
              flex-2 cursor-pointer border border-tech-main/40 px-3 py-1.5 pl-2
              font-mono text-[11px] transition-colors
              hover:bg-tech-main hover:text-white
            ">
            ◎ LOCATE
          </button>
        </div>
      </div>
    </div>
  )

  const treePanel =
    tree.length === 0 ? (
      <div className="mt-4 font-mono text-sm text-tech-main/40">
        SYS.DIR_TREE_EMPTY
      </div>
    ) : (
      renderTree(tree)
    )

  return (
    <>
      {internalScroll ? (
        <div className="relative flex min-h-0 flex-1 flex-col">
          {buttonsPanel}
          <div
            ref={scrollContainerRef}
            className={`
              custom-left-scrollbar min-h-0 flex-1 overflow-y-auto
              ${scrollClass}
            `}>
            {treePanel}
          </div>
          <div
            className="
              pointer-events-none absolute inset-x-0 bottom-0 z-20 -mr-4 -mb-2
              h-12 mask-[linear-gradient(to_bottom,transparent,black)]
              [-webkit-mask-image:linear-gradient(to_bottom,transparent,black)]
            "style={{
              background:
                "repeating-linear-gradient(45deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 4px), linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.4) 100%)",
            }}>
          </div>
        </div>
      ) : (
        <div>
          <div
            className="
              sticky top-0 z-10 mb-4 border-b guide-line bg-white/95 px-6 py-3
              backdrop-blur-sm
            ">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIsModalOpen(true)}
                className="
                  cursor-pointer border border-tech-main/40 px-3 py-1.5
                  font-mono text-[11px] transition-colors
                  hover:bg-tech-main hover:text-white
                ">
                + NEW DIR / FILE
              </button>
              <button
                onClick={collapseAll}
                className="
                  cursor-pointer border border-tech-main/40 px-3 py-1.5
                  font-mono text-[11px] transition-colors
                  hover:bg-tech-main hover:text-white
                ">
                ⊟ COLLAPSE ALL
              </button>
              <button
                onClick={scrollToCurrent}
                className="
                  cursor-pointer border border-tech-main/40 px-3 py-1.5
                  font-mono text-[11px] transition-colors
                  hover:bg-tech-main hover:text-white
                ">
                ◎ LOCATE
              </button>
            </div>
          </div>
          {treePanel}
        </div>
      )}

      {mounted &&
        isModalOpen &&
        createPortal(
          <div
            className="
              fixed inset-0 z-9999 flex items-center justify-center bg-black/80
              p-4 duration-300 animate-in fade-in
            ">
            <div
              className="
                w-full max-w-md rounded-sm border-2 border-tech-main bg-white
                p-6 shadow-[8px_8px_0_0_rgba(var(--tech-main),1)]
                dark:bg-black
              ">
              <h3
                className="
                  mb-6 border-b guide-line pb-2 font-mono text-lg font-bold
                  tracking-widest text-tech-main uppercase
                ">
                CREATE_SYS_OBJECT
              </h3>

              <form onSubmit={handleCreate} className="space-y-4 font-mono">
                <div>
                  <label
                    className="
                      mb-1 block text-[11px] tracking-wider text-tech-main/80
                      uppercase
                    ">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        title: e.target.value,
                      })
                    }
                    className="
                      w-full border border-tech-main/40 bg-tech-main/5 px-3 py-2
                      text-sm text-tech-main outline-none
                      focus:border-tech-main
                    "
                    placeholder="e.g. Overview"
                  />
                </div>

                <div>
                  <label
                    className="
                      mb-1 block text-[11px] tracking-wider text-tech-main/80
                      uppercase
                    ">
                    Slug (URL path)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    className="
                      w-full border border-tech-main/40 bg-tech-main/5 px-3 py-2
                      text-sm text-tech-main outline-none
                      focus:border-tech-main
                    "
                    placeholder="Leave empty to auto-generate"
                  />
                </div>

                <div
                  className="
                    flex items-center gap-3 border guide-line bg-tech-main/5
                    px-3 py-2
                  ">
                  <input
                    type="checkbox"
                    id="isFolder"
                    checked={formData.isFolder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isFolder: e.target.checked,
                      })
                    }
                    className="size-4 accent-tech-main"
                  />
                  <label
                    htmlFor="isFolder"
                    className="
                      cursor-pointer text-sm text-tech-main/80 select-none
                    ">
                    Create as Directory (Folder)
                  </label>
                </div>

                <div>
                  <label
                    className="
                      mb-1 block text-[11px] tracking-wider text-tech-main/80
                      uppercase
                    ">
                    Parent Directory
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parentId: e.target.value,
                      })
                    }
                    className="
                      w-full border border-tech-main/40 bg-tech-main/5 px-3 py-2
                      text-sm text-tech-main outline-none
                    ">
                    <option value="">[ ROOT_DIRECTORY ]</option>
                    {availableFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className="
                    mt-6 flex justify-end gap-2 border-t guide-line pt-4
                  ">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="
                      cursor-pointer border border-tech-main/40 px-4 py-2
                      text-[11px] font-bold tracking-widest text-tech-main
                      uppercase transition-colors
                      hover:bg-tech-main/10
                    ">
                    ABORT
                  </button>
                  <button
                    type="submit"
                    className="
                      cursor-pointer bg-tech-main px-4 py-2 text-[11px]
                      font-bold tracking-widest text-white uppercase
                      shadow-[2px_2px_0_0_rgba(var(--tech-main),0.4)]
                      transition-opacity
                      hover:opacity-90
                    ">
                    EXECUTE
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
