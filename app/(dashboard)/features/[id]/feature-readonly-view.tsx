"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { BrutalCard } from "@/components/ui/brutal-card"
import { getMarkdownComponents, getPluginsForContent } from "@/lib/markdown"
import "katex/dist/katex.min.css"

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
  const [activeTab, setActiveTab] = useState<"rendered" | "source">("rendered")
  const { remarkPlugins, rehypePlugins } = getPluginsForContent(content)
  const markdownComponents = getMarkdownComponents("")

  return (
    <BrutalCard>
      <h2
        className="
          mb-4 text-sm font-bold
          sm:text-base
          md:text-lg
        ">
        {title}
      </h2>

      {tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="
                border border-tech-main bg-tech-accent/10 px-2 py-1 font-mono
                text-xs text-tech-main uppercase
              ">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-8 border-t border-dashed border-tech-main/30 pt-6">
        <div
          className="
            flex flex-col overflow-hidden border border-tech-main/40 bg-white/50
            backdrop-blur-sm
          ">
          <div
            role="tablist"
            aria-label="Editor mode"
            className="
              flex items-center border-b border-tech-main/40 bg-tech-main/10
              font-mono text-xs
            ">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "rendered"}
              aria-controls="feature-rendered-panel"
              onClick={() => setActiveTab("rendered")}
              className={`
                px-4 py-2 transition-colors select-none
                ${
                  activeTab === "rendered"
                    ? "bg-tech-main text-white"
                    : `
                      cursor-pointer text-tech-main/60
                      hover:bg-tech-main/10
                    `
                }
              `}>
              RENDERED_
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "source"}
              aria-controls="feature-source-panel"
              onClick={() => setActiveTab("source")}
              className={`
                px-4 py-2 transition-colors select-none
                ${
                  activeTab === "source"
                    ? "bg-tech-main text-white"
                    : `
                      cursor-pointer text-tech-main/60
                      hover:bg-tech-main/10
                    `
                }
              `}>
              SOURCE_
            </button>
          </div>

          <div className="min-h-[200px]">
            {activeTab === "rendered" ? (
              <div
                id="feature-rendered-panel"
                role="tabpanel"
                aria-labelledby="tab-rendered">
                {content?.trim() ? (
                  <div className="prose prose-tech w-full max-w-none overflow-hidden wrap-break-word p-6 sm:p-8 selection:bg-tech-main/20 selection:text-slate-900">
                    <ReactMarkdown
                      remarkPlugins={remarkPlugins}
                      rehypePlugins={rehypePlugins}
                      components={markdownComponents}>
                      {content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="p-6 font-mono text-xs text-tech-main/40">
                    NOTHING_TO_PREVIEW_
                  </p>
                )}
              </div>
            ) : (
              <div
                id="feature-source-panel"
                role="tabpanel"
                aria-labelledby="tab-source">
                {content?.trim() ? (
                  <pre
                    className="
                      p-6 font-mono text-sm/relaxed whitespace-pre-wrap
                    ">
                    {content}
                  </pre>
                ) : (
                  <p className="p-6 font-mono text-xs text-tech-main/40">
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
