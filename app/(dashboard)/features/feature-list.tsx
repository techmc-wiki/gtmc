"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { BrutalCard } from "@/components/ui/brutal-card"
import { RevealSection } from "./reveal-helpers"

export function StatusBadge({ status }: { status: string }) {
  let styles =
    "px-2 py-0.5 text-xs font-mono tracking-wider border shrink-0"
  let label = status

  switch (status) {
    case "PENDING":
      styles +=
        " border-yellow-500/40 text-yellow-600 bg-yellow-500/10"
      label = "UNRESOLVED"
      break
    case "IN_PROGRESS":
      styles += " border-blue-500/40 text-blue-600 bg-blue-500/10"
      label = "IN_PROGRESS"
      break
    case "RESOLVED":
      styles += " border-green-500/40 text-green-600 bg-green-500/10"
      label = "RESOLVED"
      break
    default:
      styles += " border-gray-500/40 text-gray-600 bg-gray-500/10"
  }

  return <span className={styles}>[{label}]</span>
}

interface Feature {
  id: string
  title: string
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED"
  tags?: string[]
  author?: { name?: string }
  assignee?: { name?: string }
  createdAt: string | Date
}

export function FeatureList({ features }: { features: Feature[] }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    features.forEach((f) => {
      f.tags?.forEach((t: string) => tags.add(t))
    })
    return Array.from(tags)
  }, [features])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag],
    )
  }

  // Filter and group features in a single pass
  const { filteredFeatures, groupedFeatures } = useMemo(() => {
    const filtered = features.filter((f) => {
      const matchTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => f.tags?.includes(tag))
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "UNRESOLVED" && f.status !== "RESOLVED") ||
        f.status === statusFilter
      return matchTags && matchStatus
    })

    const grouped = {
      PENDING: [] as Feature[],
      IN_PROGRESS: [] as Feature[],
      RESOLVED: [] as Feature[],
    }

    filtered.forEach((f) => {
      if (f.status === "PENDING") {
        grouped.PENDING.push(f)
      } else if (f.status === "IN_PROGRESS") {
        grouped.IN_PROGRESS.push(f)
      } else if (f.status === "RESOLVED") {
        grouped.RESOLVED.push(f)
      }
    })

    return { filteredFeatures: filtered, groupedFeatures: grouped }
  }, [features, selectedTags, statusFilter])

  const pendingFeatures = groupedFeatures.PENDING
  const inProgressFeatures = groupedFeatures.IN_PROGRESS
  const resolvedFeatures = groupedFeatures.RESOLVED

  const renderFeatureGroup = (
    title: string,
    groupFeatures: Feature[],
    emptyText: string,
    delay: 0 | 100 | 200 | 300 | 400,
  ) => {
    if (groupFeatures.length === 0) {
      return null
    }

    return (
      <RevealSection delay={delay}>
        <div className="mb-8">
          <h2 className="border-tech-main/20 text-tech-main-dark mb-6 border-b pb-2 text-lg font-bold tracking-widest uppercase md:text-xl">
            {title} ({groupFeatures.length})
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groupFeatures.map((feature) => (
              <Link
                key={feature.id}
                href={`/features/${feature.id}`}
                className="block">
                <BrutalCard className="border-tech-main/40 group hover:border-tech-main/60 relative flex h-auto flex-col justify-between border bg-white/80 p-6 backdrop-blur-sm transition-colors sm:h-64">
                  {/* Corner brackets */}
                  <div className="border-tech-main/40 absolute top-0 left-0 h-2 w-2 -translate-x-[1px] -translate-y-[1px] border-t-2 border-l-2 opacity-0 transition-opacity group-hover:opacity-100"></div>
                  <div className="border-tech-main/40 absolute right-0 bottom-0 h-2 w-2 translate-x-[1px] translate-y-[1px] border-r-2 border-b-2 opacity-0 transition-opacity group-hover:opacity-100"></div>

                  <div className="relative z-10 flex h-full flex-col">
                    <div className="mb-4 flex items-start justify-between gap-2">
                      <StatusBadge status={feature.status} />
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className="text-tech-main/50 font-mono text-xs"
                          suppressHydrationWarning>
                          {new Date(
                            feature.createdAt,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-tech-main-dark border-tech-main/40 mt-2 line-clamp-2 border-l-2 pl-3 text-lg font-bold tracking-tight uppercase">
                      {feature.title}
                    </h3>

                    <div className="mt-4 flex flex-col gap-2">
                      <p className="text-tech-main flex items-center font-mono text-xs tracking-widest opacity-80">
                        <span className="bg-tech-main mr-2 inline-block h-1.5 w-1.5"></span>
                        AUTHOR:{" "}
                        {feature.author?.name || "UNKNOWN_USER"}
                      </p>
                      {feature.assignee && (
                        <p className="flex items-center font-mono text-xs tracking-widest text-blue-600 opacity-80">
                          <span className="mr-2 inline-block h-1.5 w-1.5 bg-blue-600"></span>
                          ASSIGNEE:{" "}
                          {feature.assignee.name || "UNKNOWN_USER"}
                        </p>
                      )}
                    </div>

                    {feature.tags && feature.tags.length > 0 && (
                      <div className="mt-auto flex flex-wrap gap-1 pt-4">
                        {feature.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="bg-tech-main/5 border-tech-main/20 text-tech-main/70 border px-1.5 py-0.5 font-mono text-[10px] uppercase">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </BrutalCard>
              </Link>
            ))}
          </div>
        </div>
      </RevealSection>
    )
  }

  return (
    <div className="space-y-6">
      {/* 过滤器 */}
      <RevealSection delay={0}>
        <BrutalCard className="border-tech-main/40 bg-white/80 p-6 backdrop-blur-sm">
          <div className="space-y-4">
            <div>
              <h4 className="text-tech-main mb-3 font-mono text-sm tracking-widest uppercase">
                FILTER_BY_STATUS_
              </h4>
              <div className="flex flex-wrap gap-2">
                {[
                  "ALL",
                  "UNRESOLVED",
                  "PENDING",
                  "IN_PROGRESS",
                  "RESOLVED",
                ].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`flex min-h-8 cursor-pointer items-center justify-center border px-3 py-2 font-mono text-xs transition-all ${
                      statusFilter === status
                        ? "bg-tech-main border-tech-main text-white"
                        : "text-tech-main border-tech-main/40 hover:border-tech-main/60 bg-transparent"
                    }`}>
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {allTags.length > 0 && (
              <div>
                <h4 className="text-tech-main mb-3 font-mono text-sm tracking-widest uppercase">
                  FILTER_BY_TAGS_
                </h4>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`flex min-h-8 cursor-pointer items-center justify-center border px-3 py-2 font-mono text-xs uppercase transition-all ${
                        selectedTags.includes(tag)
                          ? "bg-tech-accent border-tech-accent text-white"
                          : "bg-tech-accent/5 text-tech-main border-tech-main/40 hover:border-tech-main/60"
                      }`}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </BrutalCard>
      </RevealSection>

      {/* List grouping display */}
      <div className="mt-8">
        {filteredFeatures.length === 0 ? (
          <div className="border-tech-main/40 text-tech-main/50 border border-dashed bg-white/30 py-16 text-center font-mono">
            NO_FEATURES_FOUND_
          </div>
        ) : (
          <>
            {renderFeatureGroup(
              "待解决 / PENDING",
              pendingFeatures,
              "No pending features",
              200,
            )}
            {renderFeatureGroup(
              "解决中 / IN PROGRESS",
              inProgressFeatures,
              "No features in progress",
              300,
            )}
            {renderFeatureGroup(
              "已解决 / RESOLVED",
              resolvedFeatures,
              "No resolved features",
              400,
            )}
          </>
        )}
      </div>
    </div>
  )
}
