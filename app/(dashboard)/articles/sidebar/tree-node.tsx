"use client"

import Link from "next/link"
import type { TocItem } from "./use-toc"
import { formatIndexPrefix } from "@/lib/index-formatter"
import { encodeSlug } from "@/lib/slug-utils"
import type { TreeNode } from "@/types/sidebar-tree"
import React from "react"

export type { TreeNode } from "@/types/sidebar-tree"

export function SidebarTree({
  items,
  effectivePath,
  isFileExpanded,
  toc,
  activeHeadingId,
  isFolderExpanded,
  toggleFolder,
  toggleFileExp,
  onNavigate,
  setIsFileExpanded,
  highlightActive,
  activeItemRef,
  folderGridRefs,
}: {
  items: TreeNode[]
  effectivePath: string
  isFileExpanded: boolean
  toc: TocItem[]
  activeHeadingId: string | null
  isFolderExpanded: (id: string) => boolean
  toggleFolder: (id: string, e: React.MouseEvent) => void
  toggleFileExp: (e: React.MouseEvent) => void
  onNavigate?: () => void
  setIsFileExpanded: React.Dispatch<React.SetStateAction<boolean>>
  highlightActive: boolean
  activeItemRef: React.RefObject<HTMLLIElement | null>
  folderGridRefs: React.RefObject<Map<string, HTMLDivElement>>
}) {
  const decodedPathname = decodeURIComponent(effectivePath)
  const firstAppendixArticleIndex = items.findIndex(
    (item) => !item.isFolder && (item.isAppendix ?? false)
  )
  const hasRegularBeforeFirstAppendix =
    firstAppendixArticleIndex > 0 &&
    items
      .slice(0, firstAppendixArticleIndex)
      .some((item) => !item.isFolder && !(item.isAppendix ?? false))

  return (
    <ul className="my-1 pl-6">
      {items.map((item, index) => {
        const fileRoute = `/articles/${encodeSlug(item.slug)}`
        const decodedRoute = decodeURIComponent(fileRoute)
        const isActive =
          !item.isFolder &&
          (decodedPathname === decodedRoute ||
            decodedPathname === `${decodedRoute}/`)
        const folderExpanded = item.isFolder ? isFolderExpanded(item.id) : false
        const showAppendixSeparator =
          index === firstAppendixArticleIndex && hasRegularBeforeFirstAppendix

        return (
          <React.Fragment key={item.id}>
            {showAppendixSeparator && (
              <li
                key={`appendix-separator-before-${item.id}`}
                className="
                  mt-3 mb-1.5 flex list-none items-center gap-2 pl-1 font-mono
                  text-[10px] tracking-[0.12em] text-tech-main/50 uppercase
                  md:text-[11px]
                ">
                <span className="h-px flex-1 bg-tech-main/25" />
                <span>Appendix</span>
                <span className="h-px w-4 bg-tech-main/25" />
              </li>
            )}

            <li
              key={item.id}
              data-sidebar-row="1"
              ref={!item.isFolder && isActive ? activeItemRef : undefined}
              className={`
                relative my-1.5 w-fit list-none font-mono text-[16px]
                transition-all duration-300
                md:text-base
                ${
                  !item.isFolder && isActive && highlightActive
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
                  type="button"
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
                      ${
                        isActive
                          ? `font-bold text-tech-main`
                          : `
                          text-slate-700
                          hover:text-tech-main
                        `
                      }
                    `}>
                    {isActive && toc.length > 0 ? (
                      <button
                        type="button"
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
                          ${
                            isActive
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
                        ${
                          isActive
                            ? `cursor-pointer border-tech-main/50`
                            : `
                            border-transparent
                            group-hover:border-tech-main/30
                          `
                        }
                      `}>
                      {item.isReadmeIntro
                        ? `00 ${item.title}`
                        : !item.isFolder && item.index !== undefined
                          ? `${formatIndexPrefix(item.index, item.isAppendix ?? false, item.isPreface ?? false)}${item.title}`
                          : item.title}
                      {item.isAdvanced && (
                        <span
                          className="
                            mx-1 inline-block shrink-0 border
                            border-violet-400/30 bg-violet-600/5 px-1
                            align-middle font-mono text-[10px] tracking-tight
                            text-violet-400 uppercase
                          ">
                          ◈ ADV
                        </span>
                      )}
                    </Link>
                  </div>

                  {isActive && toc.length > 0 && (
                    <div
                      className={`
                        grid transition-all duration-300 ease-out
                        ${
                          isFileExpanded
                            ? "grid-rows-[1fr] opacity-100"
                            : `grid-rows-[0fr] opacity-0`
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
                              className={`
                                relative text-[13px] transition-colors
                                before:absolute before:top-1/2 before:-left-4
                                before:h-px before:w-2 before:-translate-y-1/2
                                before:content-['']
                                hover:text-tech-main
                                md:text-sm
                                ${
                                  h2.id === activeHeadingId
                                    ? `
                                    font-semibold text-tech-main
                                    before:bg-tech-main
                                  `
                                    : `
                                    text-tech-main/70
                                    before:bg-tech-main/30
                                  `
                                }
                              `}>
                              <Link
                                href={`#${h2.id}`}
                                onClick={() => onNavigate?.()}
                                className="block wrap-break-word">
                                {item.isAdvanced && (
                                  <span
                                    className="
                                    mr-1 text-[8px] text-violet-500
                                  ">
                                    ●
                                  </span>
                                )}
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
                    ${
                      !item.isFolder || folderExpanded
                        ? `grid-rows-[1fr] opacity-100`
                        : `grid-rows-[0fr] opacity-0`
                    }
                  `}>
                  <div className="overflow-hidden">
                    <SidebarTree
                      items={item.children}
                      effectivePath={effectivePath}
                      isFileExpanded={isFileExpanded}
                      toc={toc}
                      activeHeadingId={activeHeadingId}
                      isFolderExpanded={isFolderExpanded}
                      toggleFolder={toggleFolder}
                      toggleFileExp={toggleFileExp}
                      onNavigate={onNavigate}
                      setIsFileExpanded={setIsFileExpanded}
                      highlightActive={highlightActive}
                      activeItemRef={activeItemRef}
                      folderGridRefs={folderGridRefs}
                    />
                  </div>
                </div>
              )}
            </li>
          </React.Fragment>
        )
      })}
    </ul>
  )
}
