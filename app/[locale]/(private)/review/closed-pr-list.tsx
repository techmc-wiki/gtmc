"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { TechCard } from "@/components/ui/tech-card"
import type { ClosedPRListItem } from "./page"

const PAGE_SIZE = 10

type ClosedPRListProps = {
  getClosedPRsAction: (page: number) => Promise<ClosedPRListItem[]>
}

function ClosedPRSkeletonRows() {
  const skeletonKeys = ["alpha", "beta", "gamma"]

  return (
    <div className="grid grid-cols-1 gap-6">
      {skeletonKeys.map((key) => (
        <TechCard
          key={`closed-pr-skeleton-${key}`}
          className="border-tech-line relative border bg-white/80 p-6 backdrop-blur-sm">
          <CornerBrackets variant="hover" />
          <div className="relative z-10 animate-pulse space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="border-tech-line bg-tech-bg h-5 w-20 border" />
              <div className="bg-tech-accent/40 h-4 w-28" />
              <div className="border-tech-line bg-tech-bg h-5 w-24 border" />
            </div>
            <div className="border-tech-line bg-tech-accent/35 h-6 w-3/4 border-l-2 pl-3" />
            <div className="bg-tech-accent/30 h-4 w-40" />
            <div className="border-tech-line bg-tech-bg h-6 w-36 border" />
          </div>
        </TechCard>
      ))}
    </div>
  )
}

function ClosedPRCard({ pr }: { pr: ClosedPRListItem }) {
  const statusClassName = pr.isMerged
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
    : "border-[var(--color-tech-line)] bg-[var(--color-tech-bg)] text-[var(--color-tech-main)]"

  return (
    <TechCard className="group border-tech-line relative border bg-white/80 p-6 backdrop-blur-sm">
      <CornerBrackets variant="hover" />

      <div className="relative z-10 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 font-mono text-xs tracking-wider text-blue-600">
            [PR #{pr.number}]
          </span>
          <span className="mono-label">
            {new Date(pr.createdAt).toLocaleString()}
          </span>
          <span
            className={`border px-2 py-0.5 font-mono text-[0.6875rem] tracking-widest ${statusClassName}`}>
            {pr.isMerged ? "MERGED_" : "CLOSED_"}
          </span>
        </div>

        <h3 className="border-tech-main/40 text-tech-main-dark border-l-2 pl-3 text-lg font-bold tracking-tight uppercase md:text-xl">
          {pr.title || "UNTITLED"}
        </h3>

        <p className="text-tech-main/80 pl-3 font-mono text-xs">
          Submitted by:{" "}
          <span className="text-tech-main-dark font-bold">
            {pr.userLogin || "UNKNOWN"}
          </span>
        </p>

        <p className="guide-line bg-tech-main/5 text-tech-main ml-3 inline-flex items-center border px-2 py-1 font-mono text-xs">
          <span className="bg-tech-main mr-2 size-1.5"></span> TARGET:{" "}
          {pr.headRef}
        </p>
      </div>
    </TechCard>
  )
}

export function ClosedPRList({ getClosedPRsAction }: ClosedPRListProps) {
  const [closedPRs, setClosedPRs] = useState<ClosedPRListItem[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const isRequestInFlightRef = useRef(false)

  const loadPage = useCallback(
    async (nextPage: number) => {
      if (isRequestInFlightRef.current) {
        return
      }

      isRequestInFlightRef.current = true
      setError(null)

      if (nextPage === 1) {
        setIsInitialLoading(true)
      } else {
        setIsFetchingMore(true)
      }

      try {
        const nextPRs = await getClosedPRsAction(nextPage)

        setClosedPRs((current) =>
          nextPage === 1 ? nextPRs : [...current, ...nextPRs]
        )
        setPage(nextPage)
        setHasMore(nextPRs.length === PAGE_SIZE)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        isRequestInFlightRef.current = false
        setIsInitialLoading(false)
        setIsFetchingMore(false)
      }
    },
    [getClosedPRsAction]
  )

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadPage(1)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [loadPage])

  useEffect(() => {
    if (
      !sentinelRef.current ||
      !hasMore ||
      isInitialLoading ||
      isFetchingMore
    ) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadPage(page + 1)
        }
      },
      { rootMargin: "240px 0px" }
    )

    observer.observe(sentinelRef.current)

    return () => observer.disconnect()
  }, [hasMore, isFetchingMore, isInitialLoading, loadPage, page])

  return (
    <div className="space-y-4">
      <h2 className="border-tech-main/50 text-tech-main border-b-2 pb-2 font-bold tracking-widest uppercase">
        CLOSED_&amp;_MERGED_
      </h2>

      {closedPRs.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          {closedPRs.map((pr) => (
            <ClosedPRCard key={pr.id} pr={pr} />
          ))}
        </div>
      )}

      {(isInitialLoading || isFetchingMore) && <ClosedPRSkeletonRows />}

      {!isInitialLoading && closedPRs.length === 0 && !error && (
        <p className="text-tech-main/60 font-mono text-xs tracking-widest uppercase">
          No closed pull requests found.
        </p>
      )}

      {error && (
        <div className="border-l-2 border-red-500/40 bg-red-500/5 px-3 py-2 font-mono text-xs text-red-600">
          {error}
        </div>
      )}

      <div ref={sentinelRef} aria-hidden="true" className="h-1 w-full" />
    </div>
  )
}
