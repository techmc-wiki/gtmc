"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { BrutalCard } from "@/components/ui/brutal-card";
import { RevealSection } from "./reveal-helpers";

export function StatusBadge({ status }: { status: string }) {
  let styles = "px-2 text-xs font-bold uppercase border";
  let label = status;

  switch (status) {
    case "PENDING":
      styles += " bg-yellow-100 border-yellow-400 text-yellow-800";
      label = "UNRESOLVED";
      break;
    case "IN_PROGRESS":
      styles += " bg-blue-100 border-blue-400 text-blue-800";
      label = "IN_PROGRESS";
      break;
    case "RESOLVED":
      styles += " bg-green-100 border-green-400 text-green-800";
      label = "RESOLVED";
      break;
    default:
      styles += " bg-zinc-100 border-zinc-300 text-zinc-600";
  }

  return <span className={styles}>{label}</span>;
}

export function FeatureList({ features }: { features: any[] }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    features.forEach((f) => {
      f.tags?.forEach((t: string) => tags.add(t));
    });
    return Array.from(tags);
  }, [features]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // Filter and group features in a single pass
  const { filteredFeatures, groupedFeatures } = useMemo(() => {
    const filtered = features.filter((f) => {
      const matchTags =
        selectedTags.length === 0 || selectedTags.every((tag) => f.tags?.includes(tag));
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "UNRESOLVED" && f.status !== "RESOLVED") ||
        f.status === statusFilter;
      return matchTags && matchStatus;
    });

    const grouped = {
      PENDING: [] as any[],
      IN_PROGRESS: [] as any[],
      RESOLVED: [] as any[],
    };

    filtered.forEach((f) => {
      if (f.status === "PENDING") {
        grouped.PENDING.push(f);
      } else if (f.status === "IN_PROGRESS") {
        grouped.IN_PROGRESS.push(f);
      } else if (f.status === "RESOLVED") {
        grouped.RESOLVED.push(f);
      }
    });

    return { filteredFeatures: filtered, groupedFeatures: grouped };
  }, [features, selectedTags, statusFilter]);

  const pendingFeatures = groupedFeatures.PENDING;
  const inProgressFeatures = groupedFeatures.IN_PROGRESS;
  const resolvedFeatures = groupedFeatures.RESOLVED;

  const renderFeatureGroup = (
    title: string,
    groupFeatures: any[],
    emptyText: string,
    delay: 0 | 100 | 200 | 300 | 400,
  ) => {
    if (groupFeatures.length === 0) {
      return null;
    }

    return (
      <RevealSection delay={delay}>
        <div className="mb-8">
          <h3 className="text-sm md:text-base font-bold tracking-widest uppercase mb-4 border-l-2 border-tech-main pl-3 text-tech-main">
            {title} ({groupFeatures.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groupFeatures.map((feature) => (
              <Link key={feature.id} href={`/features/${feature.id}`} className="block">
                <BrutalCard className="hover:border-zinc-800 transition-colors flex flex-col gap-4 p-6 cursor-pointer bg-white/80 backdrop-blur-sm border-tech-main/40">
                  <div className="space-y-2 flex-grow">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <StatusBadge status={feature.status} />
                      <h2 className="text-sm md:text-base font-bold break-words">
                        {feature.title}
                      </h2>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-mono">
                      <span className="bg-zinc-100 px-2 py-0.5 border border-zinc-200">
                        Author: {feature.author?.name || "Unknown"}
                      </span>
                      <span
                        className="bg-zinc-100 px-2 py-0.5 border border-zinc-200 text-zinc-500"
                        suppressHydrationWarning
                      >
                        {new Date(feature.createdAt).toLocaleDateString()}
                      </span>
                      {feature.assignee && (
                        <span className="bg-blue-50 text-blue-800 px-2 py-0.5 border border-blue-200">
                          Assignee: {feature.assignee.name || "Unknown"}
                        </span>
                      )}
                    </div>

                    {feature.tags && feature.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {feature.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="text-xs font-mono uppercase border border-tech-main text-tech-main bg-tech-accent/10 px-2 py-0.5"
                          >
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
    );
  };

  return (
    <div className="space-y-6">
      {/* 过滤器 */}
      <RevealSection delay={0}>
        <BrutalCard className="p-6 bg-white/80 backdrop-blur-sm border-tech-main/40">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-mono uppercase tracking-widest text-tech-main mb-3">
                FILTER_BY_STATUS_
              </h4>
              <div className="flex flex-wrap gap-2">
                {["ALL", "UNRESOLVED", "PENDING", "IN_PROGRESS", "RESOLVED"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`text-xs font-mono px-3 py-2 border transition-all min-h-[44px] flex items-center justify-center ${
                      statusFilter === status
                        ? "bg-tech-main text-white border-tech-main"
                        : "bg-transparent text-tech-main border-tech-main/40 hover:border-tech-main/60"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {allTags.length > 0 && (
              <div>
                <h4 className="text-sm font-mono uppercase tracking-widest text-tech-main mb-3">
                  FILTER_BY_TAGS_
                </h4>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`text-xs font-mono uppercase px-3 py-2 border transition-all min-h-[44px] flex items-center justify-center ${
                        selectedTags.includes(tag)
                          ? "bg-tech-accent text-white border-tech-accent"
                          : "bg-tech-accent/5 text-tech-main border-tech-main/40 hover:border-tech-main/60"
                      }`}
                    >
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
          <div className="text-center py-16 border border-dashed border-tech-main/40 font-mono text-tech-main/50 bg-white/30">
            NO_FEATURES_FOUND_
          </div>
        ) : (
          <>
            {renderFeatureGroup("待解决 / PENDING", pendingFeatures, "No pending features", 200)}
            {renderFeatureGroup(
              "解决中 / IN PROGRESS",
              inProgressFeatures,
              "No features in progress",
              300,
            )}
            {renderFeatureGroup("已解决 / RESOLVED", resolvedFeatures, "No resolved features", 400)}
          </>
        )}
      </div>
    </div>
  );
}
