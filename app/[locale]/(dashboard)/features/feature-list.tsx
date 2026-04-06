"use client"

import { useState, useMemo } from "react"
import { Link } from "@/i18n/navigation"
import { TechCard } from "@/components/ui/tech-card"
import { RevealSection } from "./reveal-helpers"
import { FeatureStatusBadge } from "@/components/ui/status-badge"
import { CardHeaderRow } from "@/components/ui/card-header-row"
import { SectionTitle } from "@/components/ui/section-title"
import { TagList } from "@/components/ui/tag-list"
import { FilterButtonGroup } from "./filter-button-group"
import { StatusDot } from "@/components/ui/status-dot"

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
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
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
    delay: 0 | 100 | 200 | 300 | 400
  ) => {
    if (groupFeatures.length === 0) {
      return null
    }

    return (
      <RevealSection delay={delay}>
        <div className="mb-8">
          <SectionTitle>
            {title} ({groupFeatures.length})
          </SectionTitle>
          <div
            className="
              grid grid-cols-1 gap-6
              md:grid-cols-2
              lg:grid-cols-3
            ">
            {groupFeatures.map((feature) => (
              <Link
                key={feature.id}
                href={`/features/${feature.id}`}
                className="block">
                <TechCard
                  className="
                    group relative flex h-auto flex-col justify-between border
                    border-tech-main/40 bg-white/80 p-6 backdrop-blur-sm
                    transition-colors
                    hover:border-tech-main/60
                    sm:h-64
                  ">
                  {/* Corner brackets */}
                  <div
                    className="
                      absolute top-0 left-0 size-2 -translate-px border-t-2
                      border-l-2 border-tech-main/40 opacity-0
                      transition-opacity
                      group-hover:opacity-100
                    "
                  />
                  <div
                    className="
                      absolute right-0 bottom-0 size-2 translate-px border-r-2
                      border-b-2 border-tech-main/40 opacity-0
                      transition-opacity
                      group-hover:opacity-100
                    "
                  />

                  <div className="relative z-10 flex h-full flex-col">
                    <CardHeaderRow
                      badge={<FeatureStatusBadge status={feature.status} />}
                      date={new Date(feature.createdAt).toLocaleDateString()}
                    />

                    <h3
                      className="
                        mt-2 line-clamp-2 border-l-2 border-tech-main/40 pl-3
                        text-lg font-bold tracking-tight text-tech-main-dark
                        uppercase
                      ">
                      {feature.title}
                    </h3>

                    <div className="mt-4 flex flex-col gap-2">
                      <p
                        className="
                          flex items-center font-mono text-xs tracking-widest
                          text-tech-main opacity-80
                        ">
                        <StatusDot size="sm" variant="main" className="mr-2" />
                        AUTHOR: {feature.author?.name || "UNKNOWN_USER"}
                      </p>
                      {feature.assignee && (
                        <p
                          className="
                            flex items-center font-mono text-xs tracking-widest
                            text-blue-600 opacity-80
                          ">
                          <StatusDot
                            size="sm"
                            variant="accent"
                            className="mr-2"
                          />
                          ASSIGNEE: {feature.assignee.name || "UNKNOWN_USER"}
                        </p>
                      )}
                    </div>

                    {feature.tags && feature.tags.length > 0 && (
                      <TagList tags={feature.tags} className="mt-auto pt-4" />
                    )}
                  </div>
                </TechCard>
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
        <TechCard
          className="
          border-tech-main/40 bg-white/80 p-6 backdrop-blur-sm
        ">
          <div className="space-y-4">
            <div>
              <h4
                className="
                  mb-3 font-mono text-sm tracking-widest text-tech-main
                  uppercase
                ">
                FILTER_BY_STATUS_
              </h4>
              <FilterButtonGroup
                options={[
                  { label: "ALL", value: "ALL" },
                  { label: "UNRESOLVED", value: "UNRESOLVED" },
                  { label: "PENDING", value: "PENDING" },
                  { label: "IN_PROGRESS", value: "IN_PROGRESS" },
                  { label: "RESOLVED", value: "RESOLVED" },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>

            {allTags.length > 0 && (
              <div>
                <h4
                  className="
                    mb-3 font-mono text-sm tracking-widest text-tech-main
                    uppercase
                  ">
                  FILTER_BY_TAGS_
                </h4>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`
                        flex min-h-8 cursor-pointer items-center justify-center
                        border px-3 py-2 font-mono text-xs uppercase
                        transition-all
                        ${
                          selectedTags.includes(tag)
                            ? "border-tech-accent bg-tech-accent text-white"
                            : `
                              border-tech-main/40 bg-tech-accent/5
                              text-tech-main
                              hover:border-tech-main/60
                            `
                        }
                      `}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TechCard>
      </RevealSection>

      {/* List grouping display */}
      <div className="mt-8">
        {filteredFeatures.length === 0 ? (
          <div
            className="
              border border-dashed border-tech-main/40 bg-white/30 py-16
              text-center font-mono text-tech-main/50
            ">
            NO_FEATURES_FOUND_
          </div>
        ) : (
          <>
            {renderFeatureGroup(
              "待解决 / PENDING",
              pendingFeatures,
              "No pending features",
              200
            )}
            {renderFeatureGroup(
              "解决中 / IN PROGRESS",
              inProgressFeatures,
              "No features in progress",
              300
            )}
            {renderFeatureGroup(
              "已解决 / RESOLVED",
              resolvedFeatures,
              "No resolved features",
              400
            )}
          </>
        )}
      </div>
    </div>
  )
}
