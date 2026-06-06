"use client"

import { useTranslations } from "next-intl"
import { useState, useMemo, useCallback } from "react"
import { Link } from "@/i18n/navigation"
import { TechCard } from "@/components/ui/tech-card"
import { FeatureStatusBadge } from "@/components/ui/status-badge"
import { CardHeaderRow } from "@/components/ui/card-header-row"
import { SectionTitle } from "@/components/ui/section-title"
import { TagList } from "@/components/ui/tag-list"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { StatusDot } from "@/components/ui/status-dot"
import { EmptyState } from "@/components/ui/empty-state"

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
  const t = useTranslations("Feature")
  const tArticle = useTranslations("ArticleMeta")
  const tStatus = useTranslations("Status")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  const statusOptions = useMemo(
    () => [
      { label: t("filterAll"), value: "ALL" },
      { label: tStatus("pending"), value: "UNRESOLVED" },
      { label: tStatus("pending"), value: "PENDING" },
      { label: tStatus("inProgress"), value: "IN_PROGRESS" },
      { label: tStatus("resolved"), value: "RESOLVED" },
    ],
    [t, tStatus]
  )

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    features.forEach((f) => {
      f.tags?.forEach((tag: string) => {
        tags.add(tag)
      })
    })
    return [...tags]
  }, [features])

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    )
  }, [])

  const handleTagClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const tag = e.currentTarget.dataset.tag
      if (tag) toggleTag(tag)
    },
    [toggleTag]
  )

  // Filter and group features in a single pass
  const { filteredFeatures, groupedFeatures } = useMemo(() => {
    const filtered = features.filter((f) => {
      const matchTags = selectedTags.every((tag) => f.tags?.includes(tag))
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

  /* oxlint-disable react-perf/jsx-no-jsx-as-prop */
  // oxlint-disable-next-line react-perf/jsx-no-jsx-as-prop
  const renderFeatureGroup = (title: string, groupFeatures: Feature[]) => {
    if (groupFeatures.length === 0) {
      return null
    }

    return (
      <div className="mb-8">
        <SectionTitle>
          {title} ({groupFeatures.length})
        </SectionTitle>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groupFeatures.map((feature) => (
            <Link
              key={feature.id}
              href={`/features/${feature.id}`}
              className="block">
              <TechCard
                tone="main"
                borderOpacity="muted"
                background="default"
                padding="spacious"
                hover="border"
                brackets="visible"
                bracketVariant="hover-only"
                className="group relative flex h-auto flex-col justify-between sm:h-64">
                <div className="relative z-10 flex h-full flex-col">
                  <CardHeaderRow
                    badge={<FeatureStatusBadge status={feature.status} />}
                    date={formatFeatureDate(feature.createdAt)}
                  />

                  <h3 className="border-tech-main/40 text-tech-main-dark mt-2 line-clamp-2 border-l-2 pl-3 text-lg font-bold tracking-tight uppercase">
                    {feature.title}
                  </h3>

                  <div className="mt-4 flex flex-col gap-2">
                    <p className="text-tech-main flex items-center font-mono text-xs tracking-widest opacity-80">
                      <StatusDot size="sm" variant="main" className="mr-2" />
                      {tArticle("authorLabel")}:{" "}
                      {feature.author?.name || t("unknownUser")}
                    </p>
                    {feature.assignee && (
                      <p className="flex items-center font-mono text-xs tracking-widest text-blue-600 opacity-80">
                        <StatusDot
                          size="sm"
                          variant="accent"
                          className="mr-2"
                        />
                        {t("assigneeLabel")}:{" "}
                        {feature.assignee.name || t("unknownUser")}
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
    )
  }

  return (
    <div className="space-y-6">
      {/* 过滤器 */}
      <TechCard
        tone="main"
        borderOpacity="muted"
        background="default"
        padding="spacious">
        <div className="space-y-4">
          <div>
            <h4 className="text-tech-main mb-3 font-mono text-sm tracking-widest uppercase">
              {t("filterByStatus")}
            </h4>
            <SegmentedControl
              options={statusOptions}
              value={statusFilter}
              onValueChange={setStatusFilter}
            />
          </div>

          {allTags.length > 0 && (
            <div>
              <h4 className="text-tech-main mb-3 font-mono text-sm tracking-widest uppercase">
                {t("filterByTags")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    data-tag={tag}
                    onClick={handleTagClick}
                    className={`flex min-h-8 cursor-pointer items-center justify-center border px-3 py-2 font-mono text-xs uppercase transition-all duration-200 ${
                      selectedTags.includes(tag)
                        ? "border-tech-accent bg-tech-accent text-white"
                        : `border-tech-main/40 bg-tech-accent/5 text-tech-main hover:border-tech-main/60 hover:bg-tech-accent/10`
                    } `}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </TechCard>

      {/* List grouping display */}
      <div className="mt-8">
        {filteredFeatures.length === 0 ? (
          <EmptyState message={t("listEmpty")} />
        ) : (
          <>
            {renderFeatureGroup(tStatus("pending"), pendingFeatures)}
            {renderFeatureGroup(tStatus("inProgress"), inProgressFeatures)}
            {renderFeatureGroup(tStatus("resolved"), resolvedFeatures)}
          </>
        )}
      </div>
    </div>
  )
}

function formatFeatureDate(date: string | Date) {
  const parsedDate = date instanceof Date ? date : new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return "—"
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(parsedDate)
}
