"use client"

import { useState } from "react"
import { BrutalCard } from "@/components/ui/brutal-card"
import { MarkdownContent } from "@/components/markdown/markdown-content"

interface FeatureReadonlyViewProps {
  title: string
  content: string
  tags: string[]
}

export function FeatureReadonlyView({
  title,
  content,
  tags,
}: FeatureReadonlyViewProps) {
  const [activeTab, setActiveTab] = useState<"rendered" | "source">(
    "rendered",
  )

  return (
    <BrutalCard>
      <h2 className="mb-4 text-sm font-bold sm:text-base md:text-lg">
        {title}
      </h2>

      {tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="border-tech-main text-tech-main bg-tech-accent/10 border px-2 py-1 font-mono text-xs uppercase">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="border-tech-main/30 mt-8 border-t border-dashed pt-6">
        <div className="border-tech-main/40 flex flex-col overflow-hidden border bg-white/50 backdrop-blur-sm">
          <div
            role="tablist"
            aria-label="Editor mode"
            className="bg-tech-main/10 border-tech-main/40 flex items-center border-b font-mono text-xs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "rendered"}
              aria-controls="feature-rendered-panel"
              onClick={() => setActiveTab("rendered")}
              className={`px-4 py-2 transition-colors select-none ${
                activeTab === "rendered"
                  ? "bg-tech-main text-white"
                  : "text-tech-main/60 hover:bg-tech-main/10 cursor-pointer"
              }`}>
              RENDERED_
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "source"}
              aria-controls="feature-source-panel"
              onClick={() => setActiveTab("source")}
              className={`px-4 py-2 transition-colors select-none ${
                activeTab === "source"
                  ? "bg-tech-main text-white"
                  : "text-tech-main/60 hover:bg-tech-main/10 cursor-pointer"
              }`}>
              SOURCE_
            </button>
          </div>

          <div className="min-h-[200px]">
            {activeTab === "rendered" ? (
              <div
                id="feature-rendered-panel"
                role="tabpanel"
                aria-labelledby="tab-rendered">
                <MarkdownContent content={content} />
              </div>
            ) : (
              <div
                id="feature-source-panel"
                role="tabpanel"
                aria-labelledby="tab-source">
                {content?.trim() ? (
                  <pre className="p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                    {content}
                  </pre>
                ) : (
                  <p className="text-tech-main/40 p-6 font-mono text-xs">
                    NOTHING_TO_PREVIEW_
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </BrutalCard>
  )
}
