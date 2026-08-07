import { Link } from "@/i18n/navigation"
import { TriangleIcon } from "@/components/ui/icons"
import { formatIndexPrefix } from "@/lib/articles/chapter-index-prefix"
import { partitionAppendixNodes } from "@/lib/articles/navigation-data"
import { encodeSlug } from "@/lib/articles/slug-resolver"
import type { ChapterNavNode } from "@/lib/articles/chapter-nav-types"
import React from "react"
import { useReaderNavigation } from "../reader-navigation/context"

type ChapterNavRow =
  | { kind: "appendix-separator"; id: string; title: string }
  | { kind: "node"; item: ChapterNavNode; isAppendix: boolean }

function buildChapterNavRows(
  items: ChapterNavNode[],
  parentIsAppendix: boolean
): ChapterNavRow[] {
  const { regularNodes, appendixGroups } = partitionAppendixNodes(items)
  const rows = regularNodes.map<ChapterNavRow>((item) => ({
    kind: "node",
    item,
    isAppendix: parentIsAppendix,
  }))

  for (const { owner, nodes } of appendixGroups) {
    rows.push({
      kind: "appendix-separator",
      id: `${owner.id}-appendix-separator`,
      title: owner.title,
    })
    for (const item of nodes) {
      rows.push({
        kind: "node",
        item,
        isAppendix: true,
      })
    }
  }

  return rows
}

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
      aria-expanded={folderExpanded}
      className="
        mt-2 flex min-h-11 w-full cursor-pointer items-center gap-2 pl-2 text-left
        font-sans text-[0.8125rem] leading-snug font-semibold text-tech-main/80
        transition-colors hover:text-tech-main-dark md:mt-1 md:min-h-7
        focus-visible:outline-tech-main focus-visible:outline-2 focus-visible:outline-offset-2 focus:outline-none
      ">
      <span className="flex w-4 shrink-0 items-center justify-center text-tech-main/50">
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
  isAppendix,
  onNavigate,
}: {
  item: ChapterNavNode
  fileRoute: string
  isActive: boolean
  isAppendix: boolean
  onNavigate?: () => void
}) {
  const prefix = item.isReadmeIntro
    ? "00"
    : !item.isFolder && item.index !== undefined
      ? formatIndexPrefix(
          item.index,
          isAppendix,
          item.isPreface ?? false
        ).trim()
      : ""

  return (
    <Link
      href={fileRoute}
      onClick={() => onNavigate?.()}
      aria-current={isActive ? "page" : undefined}
      className={`
        grid min-h-11 w-full grid-cols-[1rem_minmax(0,1fr)] items-baseline
        gap-x-2 py-1.5 pr-1 pl-2 font-sans text-[0.8125rem] leading-snug
        transition-colors focus-visible:outline-tech-main focus-visible:outline-2
        focus-visible:outline-offset-2 md:min-h-7 md:py-0.5 md:text-sm
        ${isActive ? "font-semibold text-tech-main-dark" : "text-tech-main hover:text-tech-main-dark"}
      `}>
      <span
        aria-hidden={!prefix}
        className={`text-center font-mono leading-none text-tech-main/55 tabular-nums ${prefix ? "text-[0.6875rem]" : "text-xs"}`}>
        {prefix || "•"}
      </span>
      <span className="min-w-0">
        {item.title}
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
      </span>
    </Link>
  )
}

function FolderGrid({
  itemId,
  isFolder,
  folderExpanded,
  items,
  parentIsAppendix,
  folderGridRefs,
  onNavigate,
}: {
  itemId: string
  isFolder: boolean
  folderExpanded: boolean
  items: ChapterNavNode[]
  parentIsAppendix: boolean
  folderGridRefs: React.RefObject<Map<string, HTMLDivElement>>
  onNavigate?: () => void
}) {
  const collapsed = isFolder && !folderExpanded

  return (
    <div
      aria-hidden={collapsed}
      inert={collapsed ? true : undefined}
      ref={(el) => {
        if (el) folderGridRefs.current.set(itemId, el)
        else folderGridRefs.current.delete(itemId)
      }}
      className={`
        grid transition-all duration-300 ease-out
        ${collapsed ? `grid-rows-[0fr] opacity-0` : `grid-rows-[1fr] opacity-100`}
      `}>
      <div className="overflow-hidden">
        <ChapterNavTree
          items={items}
          parentIsAppendix={parentIsAppendix}
          onNavigate={onNavigate}
          isNested
        />
      </div>
    </div>
  )
}

export function ChapterNavTree({
  items,
  parentIsAppendix = false,
  onNavigate,
  isNested = false,
}: {
  items: ChapterNavNode[]
  parentIsAppendix?: boolean
  onNavigate?: () => void
  isNested?: boolean
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
  const rows = buildChapterNavRows(items, parentIsAppendix)

  return (
    <ul
      className={
        isNested ? "my-0.5 ml-2 border-l pl-2 guide-line" : "my-0.5"
      }>
      {rows.map((row) => {
        if (row.kind === "appendix-separator") {
          return (
            <li
              key={row.id}
              className="
                mt-2.5 mb-1 flex list-none items-center gap-2 pl-1 font-mono
                text-[0.5625rem] tracking-[0.12em] text-tech-main/50 uppercase
                md:text-[0.625rem]
              ">
              <span className="h-px flex-1 bg-tech-main/25" />
              <span>{row.title}</span>
              <span className="h-px w-4 bg-tech-main/25" />
            </li>
          )
        }

        const { item, isAppendix } = row
        const fileRoute = `/articles/${encodeSlug(item.slug)}`
        const decodedRoute = decodeURIComponent(fileRoute)
        const isActive =
          !item.isFolder &&
          (decodedPathname === decodedRoute ||
            decodedPathname === `${decodedRoute}/`)
        const folderExpanded = item.isFolder ? isFolderExpanded(item.id) : false

        return (
          <li
            key={item.id}
            data-chapter-nav-row="1"
            ref={!item.isFolder && isActive ? activeItemRef : undefined}
            className={`
                  relative my-0.5 list-none transition-all duration-300 md:my-0
                  before:absolute before:top-0 before:left-0 before:h-full before:w-0.5
                  before:transition-all before:duration-200 before:content-['']
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
                isAppendix={isAppendix}
                onNavigate={onNavigate}
              />
            )}

            {item.children && item.children.length > 0 && (
              <FolderGrid
                itemId={item.id}
                isFolder={item.isFolder}
                folderExpanded={folderExpanded}
                items={item.children}
                parentIsAppendix={isAppendix}
                folderGridRefs={folderGridRefs}
                onNavigate={onNavigate}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}
