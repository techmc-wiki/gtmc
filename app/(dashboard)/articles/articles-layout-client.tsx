"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import { SidebarClient } from "./sidebar-client"
import { MobileTreeCard } from "./mobile-tree-card"

interface TreeNode {
  id: string
  title: string
  slug: string
  isFolder: boolean
  parentId: string | null
  children: TreeNode[]
}

interface ArticlesLayoutProps {
  children: React.ReactNode
  tree: TreeNode[]
}

export function ArticlesLayoutClient({
  children,
  tree,
}: ArticlesLayoutProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isFloating, setIsFloating] = useState(false)
  const pathname = usePathname()
  const inlineShellRef = useRef<HTMLDivElement>(null)
  const canUseDOM = typeof document !== "undefined"

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFloating(!entry.isIntersecting)
      },
      {
        threshold: 0,
        rootMargin: "-64px 0px 0px 0px",
      },
    )

    if (inlineShellRef.current) {
      observer.observe(inlineShellRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const treeContent = (
    <div className="
      prose prose-base prose-tech w-full pb-4 font-mono text-[15px]
      wrap-break-word
      [&_li]:mt-1.5
      [&_ul]:list-none
      [&_ul_ul]:mt-1.5 [&_ul_ul]:mb-3 [&_ul_ul]:border-l
      [&_ul_ul]:border-tech-main/20 [&_ul_ul]:pl-3
      [&>ul]:pl-0
    ">
      <SidebarClient
        tree={tree}
        onNavigate={() => setIsOpen(false)}
      />
    </div>
  )

  return (
    <div className="
      relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-full flex-col
      md:flex-row
    ">
      {/* Mobile inline tree shell (default state) */}
      <div
        ref={inlineShellRef}
        className="
          border-b border-tech-main/40 bg-white/95 backdrop-blur-md
          md:hidden
        "
        data-testid="mobile-tree-inline-shell">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="
            flex min-h-[44px] w-full cursor-pointer items-center justify-between
            px-4 text-tech-main transition-colors
            hover:bg-tech-main/5
          "
          aria-label="Toggle article tree"
          aria-expanded={isOpen}
          data-testid="mobile-tree-toggle">
          <span className="
            font-mono text-xs font-bold tracking-[0.15em] uppercase
          ">
            TREE
          </span>
          <span className="font-mono text-sm font-bold">
            {isOpen ? "▼" : "▶"}
          </span>
        </button>

        {!isFloating && (
          <div
            className={`
              grid transition-all duration-300 ease-out
              ${
              isOpen
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }
            `}>
            <div className="overflow-hidden">
              <div className="
                max-h-[calc(100vh-12rem)] overflow-y-auto overscroll-contain
                border-t border-tech-main/20 px-4 pt-3 pb-4
              ">
                {treeContent}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile floating trigger (appears after scroll) */}
      {canUseDOM && isFloating
        ? createPortal(
            <div
              className="
                fixed top-20 right-4 z-58 flex animate-tech-pop-in items-center
                md:hidden
              "
              data-testid="mobile-tree-floating-trigger">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="
                  min-h-[44px] cursor-pointer border border-tech-main/40
                  bg-white/95 px-4 py-2 font-mono text-xs font-bold
                  tracking-[0.15em] text-tech-main uppercase backdrop-blur-md
                  transition-all duration-300
                  hover:bg-tech-main/5
                "
                aria-label="Toggle article tree"
                aria-expanded={isOpen}>
                TREE
              </button>
            </div>,
            document.body,
          )
        : null}

      {/* Mobile floating tree card */}
      <MobileTreeCard
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        isFloating={isFloating}>
        {treeContent}
      </MobileTreeCard>

      {/* Desktop sidebar */}
      <aside className="
        hidden w-64 shrink-0 border-r border-tech-main/20
        md:block
        lg:w-75
      ">
        <div className="
          sticky top-20 flex h-[calc(100vh-96px)] flex-col
          hover:z-20
          sm:top-26 sm:h-[calc(100vh-128px)]
          lg:top-28 lg:h-[calc(100vh-144px)]
        ">
          <div className="
            group relative flex min-h-0 flex-1 flex-col border-b
            border-tech-main/20 py-4 pr-2 pl-0 text-tech-main
            md:py-6 md:pl-0
          ">
            <div className="
              absolute top-0 left-0 h-0 w-px bg-tech-main opacity-20
              transition-all duration-500 ease-out
              group-hover:h-full
            "></div>

            <div className="
              group/title mb-6 flex shrink-0 items-center justify-between
              border-b border-tech-main/20 pt-8 pb-2 pl-6
            ">
              <div className="
                flex items-center font-mono text-xs font-bold tracking-tech-wide
                text-tech-main/60 uppercase
              ">
                <span className="
                  mr-2 inline-block size-1.5 animate-pulse bg-tech-main/60
                "></span>
                SYS.DIR_TREE
              </div>
            </div>

            <div className="
              custom-left-scrollbar -mt-2 h-full min-h-0 flex-1 overflow-y-auto
              pl-6
            ">
              <div className="
                prose prose-base prose-tech w-full overflow-hidden pt-2 pb-8
                font-mono text-base wrap-break-word
                [&_li]:mt-1.5
                [&_ul]:list-none
                [&_ul_ul]:mt-1.5 [&_ul_ul]:mb-3 [&_ul_ul]:border-l
                [&_ul_ul]:border-tech-main/20 [&_ul_ul]:pl-3
                [&>ul]:pl-0
              ">
                <SidebarClient tree={tree} />
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="
        relative min-w-0 flex-1 overflow-x-hidden border-l border-transparent
        py-6
        md:pl-10
        lg:pl-16
      ">
        {children}
      </main>
    </div>
  )
}
