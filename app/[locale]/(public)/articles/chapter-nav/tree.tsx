import { Link } from "@/i18n/navigation"
import { TriangleIcon } from "@/components/ui/triangle-icon"
import { formatIndexPrefix } from "@/lib/articles/chapter-index-prefix"
import { encodeSlug } from "@/lib/articles/slug-resolver"
import type { ChapterNavNode } from "@/lib/articles/chapter-nav-types"
import React from "react"
import { useReaderNavigation } from "../reader-navigation/context"

export type { ChapterNavNode } from "@/lib/articles/chapter-nav-types"

function FolderButton({
  itemId,
  title,
  folderExpanded,
  toggleFolder,
}: {
  itemId: string
  title: string
  folderExpanded: boolean
  toggleFolder: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => toggleFolder(itemId)}
      className="
        mt-3 mb-1 flex w-fit cursor-pointer items-center text-left
        font-bold text-tech-main/80 uppercase opacity-80
        transition-colors
        hover:text-tech-main
        focus-visible:outline-tech-main focus-visible:outline-2 focus-visible:outline-offset-2 focus:outline-none
      ">
      <span className="flex w-4 shrink-0 items-center text-tech-main/50">
        <TriangleIcon
          direction={folderExpanded ? "down" : "right"}
          className="size-3"
        />
      </span>
      <span>{title}</span>
    </button>
  )
}

function ArticleLink({
  item,
  fileRoute,
  isActive,
  onNavigate,
}: {
  item: ChapterNavNode
  fileRoute: string
  isActive: boolean
  onNavigate?: () => void
}) {
  return (
    <div className="relative">
      <div
        className={`
          group relative flex items-center py-1 pl-3.5
          transition-colors
          ${
            isActive
              ? `font-bold text-tech-main`
              : `
                text-tech-main
                hover:text-tech-main
              `
          }
        `}>
        <Link
          href={fileRoute}
          onClick={() => onNavigate?.()}
          className="block w-full pb-px pl-1">
          {item.isReadmeIntro
            ? `00 ${item.title}`
            : !item.isFolder && item.index !== undefined
              ? `${formatIndexPrefix(item.index, item.isAppendix ?? false, item.isPreface ?? false)}${item.title}`
              : item.title}
          {item.isAdvanced && (
            <span
              className="
                mx-1 inline-block shrink-0 bg-tech-advanced px-[3px]
                align-middle font-mono text-[0.5625rem] font-bold
                tracking-widest text-white select-none
              ">
              ADVANCED
            </span>
          )}
        </Link>
      </div>
    </div>
  )
}

function FolderGrid({
  itemId,
  isFolder,
  folderExpanded,
  items,
  folderGridRefs,
  onNavigate,
}: {
  itemId: string
  isFolder: boolean
  folderExpanded: boolean
  items: ChapterNavNode[]
  folderGridRefs: React.RefObject<Map<string, HTMLDivElement>>
  onNavigate?: () => void
}) {
  return (
    <div
      ref={(el) => {
        if (el) folderGridRefs.current.set(itemId, el)
        else folderGridRefs.current.delete(itemId)
      }}
      className={`
        grid transition-all duration-300 ease-out
        ${
          !isFolder || folderExpanded
            ? `grid-rows-[1fr] opacity-100`
            : `grid-rows-[0fr] opacity-0`
        }
      `}>
      <div className="overflow-hidden">
        <ChapterNavTree
          items={items}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  )
}

export function ChapterNavTree({
  items,
  onNavigate,
}: {
  items: ChapterNavNode[]
  onNavigate?: () => void
}) {
  const {
    effectivePath,
    isFolderExpanded,
    toggleFolder,
    highlightActive,
    activeItemRef,
    folderGridRefs,
  } = useReaderNavigation()

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
    <ul className="my-0.5 pl-5">
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
                  mt-2.5 mb-1 flex list-none items-center gap-2 pl-1 font-mono
                  text-[0.5625rem] tracking-[0.12em] text-tech-main/50 uppercase
                  md:text-[0.625rem]
                ">
                <span className="h-px flex-1 bg-tech-main/25" />
                <span>Appendix</span>
                <span className="h-px w-4 bg-tech-main/25" />
              </li>
            )}

            <li
              key={item.id}
              data-chapter-nav-row="1"
              ref={!item.isFolder && isActive ? activeItemRef : undefined}
              className={`
                 relative my-1 list-none font-mono text-[0.8125rem] transition-all
                 duration-300
                 before:absolute before:top-0 before:left-0 before:h-full
                 before:w-0.5 before:transition-all before:duration-200
                 before:content-['']
                 md:text-sm
                ${
                  !item.isFolder && isActive
                    ? `before:bg-tech-signal before:w-[3px]`
                    : !item.isFolder
                      ? `
                        before:bg-transparent
                        hover:before:w-[2px] hover:before:bg-tech-main/40
                      `
                      : `before:bg-transparent`
                }
                ${
                  !item.isFolder && isActive && highlightActive
                    ? `bg-tech-main/8`
                    : !item.isFolder && isActive
                      ? `bg-tech-main/5`
                      : !item.isFolder
                        ? `hover:bg-tech-main/5`
                        : ``
                }
              `}>
              {item.isFolder ? (
                <FolderButton
                  itemId={item.id}
                  title={item.title}
                  folderExpanded={folderExpanded}
                  toggleFolder={toggleFolder}
                />
              ) : (
                <ArticleLink
                  item={item}
                  fileRoute={fileRoute}
                  isActive={isActive}
                  onNavigate={onNavigate}
                />
              )}

              {item.children && item.children.length > 0 && (
                <FolderGrid
                  itemId={item.id}
                  isFolder={item.isFolder}
                  folderExpanded={folderExpanded}
                  items={item.children}
                  folderGridRefs={folderGridRefs}
                  onNavigate={onNavigate}
                />
              )}
            </li>
          </React.Fragment>
        )
      })}
    </ul>
  )
}
