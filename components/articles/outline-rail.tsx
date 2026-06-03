"use client"

import * as React from "react"
import { Link } from "@/i18n/navigation"
import { useReaderNavigation } from "@/app/[locale]/(public)/articles/reader-navigation/context"

const outlineDepthClasses = {
  1: "pl-3 text-sm/snug",
  2: "pl-6 text-[0.8125rem]/snug",
  3: "pl-9 text-xs/snug",
} satisfies Record<1 | 2 | 3, string>

function useScrollProgress() {
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.body.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return progress
}

export function OutlineRail() {
  const { outline, activeHeadingId } = useReaderNavigation()
  const progress = useScrollProgress()
  const outlineListRef = React.useRef<HTMLUListElement | null>(null)
  const activeItemRef = React.useRef<HTMLLIElement | null>(null)

  const progressWidthStyle = React.useMemo(
    (): React.CSSProperties => ({ width: `${progress * 100}%` }),
    [progress]
  )

  React.useEffect(() => {
    const list = outlineListRef.current
    const activeItem = activeItemRef.current
    if (!list || !activeItem) return

    const targetTop = Math.max(
      0,
      activeItem.offsetTop - list.clientHeight * 0.3
    )
    list.scrollTo({ top: targetTop, behavior: "smooth" })
  }, [activeHeadingId])

  if (outline.length === 0) {
    return <div className="hidden h-full w-52 shrink-0 md:block" aria-hidden="true" />
  }

  return (
    <div className="hidden h-full w-52 shrink-0 md:block">
      <div
        className="
          sticky top-26 z-20 flex h-[calc(100dvh-128px)]
          lg:top-28 lg:h-[calc(100dvh-144px)]
        ">
        <nav
          aria-label="Paragraph Outline"
          className="
            group relative my-auto flex h-4/5 min-h-0 w-16
            overflow-hidden border-l
            guide-line backdrop-blur-xs
            transition-[width] duration-300
            ease-[cubic-bezier(0.16,1,0.3,1)] hover:w-52
          ">
          <div className="absolute top-0 left-0 h-0.5 w-full bg-tech-main/15">
            <div
              className="h-full bg-tech-main transition-[width] duration-100"
              style={progressWidthStyle}
            />
          </div>

          <div className="absolute bottom-0 font-sans text-4xl font-black text-nowrap text-tech-main/10 uppercase transition-all duration-500 [writing-mode:vertical-rl] group-hover:opacity-0">
            Hover to Show
          </div>

          <div className="absolute bottom-0 font-sans text-4xl font-black text-nowrap text-tech-main/10 uppercase opacity-0 transition-all duration-500 [writing-mode:vertical-rl] group-hover:opacity-100">
            Paragraph Outline
          </div>

          <div
            className="
            pointer-events-none flex h-full min-h-0 w-48 shrink-0 flex-col
            gap-0 overflow-hidden bg-tech-bg/80 px-3 pt-4 pb-6 opacity-0
            backdrop-blur-xs
            transition-opacity duration-200
            group-hover:pointer-events-auto group-hover:opacity-100
          ">
            <div className="mb-3 font-mono text-[0.625rem] font-bold tracking-[0.12em] text-tech-main/50">
              paragraph outline
            </div>

            <ul
              ref={outlineListRef}
              className="
              custom-left-scrollbar flex min-h-0 flex-1 flex-col gap-0
              overflow-y-auto overflow-x-hidden pr-4 overscroll-contain
            ">
              {outline.map((item) => {
                const isActive = item.id === activeHeadingId
                return (
                  <li key={item.id} ref={isActive ? activeItemRef : undefined}>
                    <Link
                      href={`#${item.id}`}
                      className={`
                      block border-l-[3px] py-1.5 pr-1
                      wrap-break-word transition-all
                      duration-200
                      ${outlineDepthClasses[item.depth]}
                      ${
                        isActive
                          ? "border-tech-main font-semibold text-tech-main"
                          : "border-transparent text-tech-main/50 hover:border-tech-main/30 hover:text-tech-main"
                      }
                    `}>
                      {item.text}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  )
}
