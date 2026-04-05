"use client"

import Link from "next/link"
import { formatIndexPrefix } from "@/lib/index-formatter"
import { encodeSlug } from "@/lib/slug-utils"
import type { TreeNode } from "@/types/sidebar-tree"
import React from "react"
import { useSidebarContext } from "./sidebar-context"

export type { TreeNode } from "@/types/sidebar-tree"

export function SidebarTree({
  items,
  onNavigate,
}: {
  items: TreeNode[]
  onNavigate?: () => void
}) {
  const {
    effectivePath,
    isFileExpanded,
    toc,
    activeHeadingId,
    isFolderExpanded,
    toggleFolder,
    toggleFileExpanded,
    setIsFileExpanded,
    highlightActive,
    activeItemRef,
    folderGridRefs,
  } = useSidebarContext()

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
                  text-[0.625rem] tracking-[0.12em] text-tech-main/50 uppercase
                  md:text-[0.6875rem]
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
                 relative my-1.5 list-none font-mono text-[1rem] transition-all
                 duration-300
                 before:absolute before:top-0 before:left-0 before:h-full
                 before:w-0.5 before:transition-all before:duration-200
                 before:content-['']
                 md:text-base
                ${
                  !item.isFolder && isActive
                    ? `before:w-[3px] before:bg-tech-main`
                    : `
                      before:bg-transparent
                      hover:before:w-[2px] hover:before:bg-tech-main/40
                    `
                }
                ${
                  !item.isFolder && isActive && highlightActive
                    ? `bg-tech-main/8`
                    : !item.isFolder && isActive
                      ? `bg-tech-main/5`
                      : `hover:bg-tech-main/5`
                }
              `}>
              {item.isFolder ? (
                <button
                  type="button"
                  onClick={() => toggleFolder(item.id)}
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
                    {isActive && toc.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleFileExpanded}
                        className="
                          absolute top-1/2 left-0 z-10 -translate-y-1/2
                          cursor-pointer text-[0.625rem] text-tech-main
                          transition-opacity
                          hover:text-tech-main/80
                          focus:outline-none
                          md:text-xs
                        "
                        title={isFileExpanded ? "收起目录" : "展开目录"}>
                        {isFileExpanded ? "▼" : "▶"}
                      </button>
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
                      className="block w-full pb-px pl-1">
                      {item.isReadmeIntro
                        ? `00 ${item.title}`
                        : !item.isFolder && item.index !== undefined
                          ? `${formatIndexPrefix(item.index, item.isAppendix ?? false, item.isPreface ?? false)}${item.title}`
                          : item.title}
                      {item.isAdvanced && (
                        <span
                          className="
                            mx-1 inline-block shrink-0 bg-[#4c5b96] px-[3px]
                            align-middle font-mono text-[0.5625rem] font-bold
                            tracking-widest text-white select-none
                          ">
                          ADVANCED
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
                            mt-2 mb-3 ml-3 flex flex-col border-l guide-line
                          ">
                          {toc.map((h2) => (
                            <li
                              key={h2.id}
                              className={`
                                -ml-px border-l py-1.5 pl-4 text-[0.8125rem]
                                transition-all duration-200
                                md:text-[0.8125rem]
                                ${
                                  h2.id === activeHeadingId
                                    ? `
                                      border-tech-main font-medium
                                      text-tech-main
                                    `
                                    : `
                                      border-transparent text-tech-main/60
                                      hover:border-tech-main/30
                                      hover:text-tech-main
                                    `
                                }
                              `}>
                              <Link
                                href={`#${h2.id}`}
                                onClick={() => onNavigate?.()}
                                className="block leading-snug wrap-break-word">
                                {item.isAdvanced && (
                                  <span
                                    className="
                                     mr-1.5 align-middle text-[0.375rem]
                                     text-[#4c5b96]
                                   ">
                                    ■
                                  </span>
                                )}
                                <span
                                  className={
                                    h2.id === activeHeadingId
                                      ? `
                                  font-semibold
                                `
                                      : `opacity-90`
                                  }>
                                  {h2.text}
                                </span>
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
                      onNavigate={onNavigate}
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
