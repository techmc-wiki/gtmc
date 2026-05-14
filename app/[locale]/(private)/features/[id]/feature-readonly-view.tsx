import { TechCard } from "@/components/ui/tech-card"
import { MarkdownRenderer } from "@/lib/markdown"
import { getCachedRehypeShiki } from "@/lib/markdown/plugins/rehype-shiki"
import "katex/dist/katex.min.css"

interface FeatureReadonlyViewProps {
  title: string
  content: string
  tags: string[]
}

export async function FeatureReadonlyView({
  title,
  content,
  tags,
}: FeatureReadonlyViewProps) {
  const shikiPlugin = await getCachedRehypeShiki(content)

  return (
    <TechCard>
      <h2 className="mb-4 text-sm font-bold sm:text-base md:text-lg">
        {title}
      </h2>

      {tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="border-tech-main bg-tech-accent/10 text-tech-main border px-2 py-1 font-mono text-xs uppercase">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="border-tech-main/30 mt-8 border-t border-dashed pt-6">
        <div className="border-tech-main/40 flex flex-col overflow-hidden border bg-white/50 backdrop-blur-sm">
          <div className="border-tech-main/40 bg-tech-main/10 text-tech-main/80 border-b px-4 py-2 font-mono text-xs">
            RENDERED_PREVIEW
          </div>

          <div className="min-h-[200px]">
            {content?.trim() ? (
              <div className="selection:bg-tech-main/20 w-full max-w-none overflow-hidden p-6 wrap-break-word selection:text-slate-900 sm:p-8">
                <MarkdownRenderer content={content} shikiPlugin={shikiPlugin} />
              </div>
            ) : (
              <p className="editor-panel">NOTHING_TO_PREVIEW_</p>
            )}
          </div>

          <details className="guide-line border-t">
            <summary className="guide-line bg-tech-main/5 text-tech-main/70 cursor-pointer list-none border-b px-4 py-2 font-mono text-xs">
              SOURCE_ (Click to expand)
            </summary>
            {content?.trim() ? (
              <pre className="p-6 font-mono text-sm/relaxed whitespace-pre-wrap">
                {content}
              </pre>
            ) : (
              <p className="editor-panel">NOTHING_TO_PREVIEW_</p>
            )}
          </details>
        </div>
      </div>
    </TechCard>
  )
}
