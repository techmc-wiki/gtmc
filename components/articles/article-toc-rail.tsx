"use client"

import * as React from "react"
import { Link } from "@/i18n/navigation"
import { useSidebarContext } from "@/app/[locale]/(articles)/articles/sidebar/sidebar-context"

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

export function ArticleTocRail() {
  const { toc, activeHeadingId } = useSidebarContext()
  const progress = useScrollProgress()

  if (toc.length === 0) return null

  return (
    <nav
      aria-label="Paragraph Outline"
      className="
        group sticky top-48
        ml-4 hidden h-[calc(100dvh-24rem)] w-16
        shrink-0 self-start
        overflow-hidden border-l
        guide-line backdrop-blur-xs
        transition-[width] duration-300
        ease-[cubic-bezier(0.16,1,0.3,1)] hover:w-52
        sm:flex
      "
    >
      <div className="absolute top-0 left-0 h-0.5 w-full bg-tech-main/15">
        <div
          className="h-full bg-tech-main transition-[width] duration-100"
          style={{ width: `${progress * 100}%` }}
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
          pointer-events-none flex w-48 flex-col gap-0 px-3 pt-4
          pb-6 opacity-0
          transition-opacity duration-200
          group-hover:pointer-events-auto group-hover:opacity-100
        "
      >
        <div className="mb-3 font-mono text-[0.625rem] font-bold tracking-[0.12em] text-tech-main/50">
          paragraph outline
        </div>

        <ul className="flex flex-col gap-0">
          {toc.map((item) => {
            const isActive = item.id === activeHeadingId
            return (
              <li key={item.id}>
                <Link
                  href={`#${item.id}`}
                  className={`
                    block border-l-[3px] py-1.5 pr-1 pl-3 text-sm/snug
                    wrap-break-word transition-all
                    duration-200
                    ${isActive
                      ? "border-tech-main font-semibold text-tech-main"
                      : "border-transparent text-tech-main/50 hover:border-tech-main/30 hover:text-tech-main"
                    }
                  `}
                >
                  {item.text}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
