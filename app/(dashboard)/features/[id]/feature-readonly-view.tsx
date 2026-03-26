import ReactMarkdown from "react-markdown"
import { BrutalCard } from "@/components/ui/brutal-card"
import { getMarkdownComponents, getPluginsForContent } from "@/lib/markdown"
import { getCachedRehypeShiki } from "@/lib/rehype-shiki"
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
  const shikiPlugin = await getCachedRehypeShiki()
  const { remarkPlugins, rehypePlugins } = getPluginsForContent(
    content,
    shikiPlugin
  )
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
            className="
              border-b border-tech-main/40 bg-tech-main/10 px-4 py-2 font-mono
              text-xs text-tech-main/80
            ">
            RENDERED_PREVIEW
          </div>

          <div className="min-h-[200px]">
            {content?.trim() ? (
              <div
                className="
                  w-full max-w-none overflow-hidden p-6 wrap-break-word
                  selection:bg-tech-main/20 selection:text-slate-900
                  sm:p-8
                ">
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

          <details className="border-t guide-line">
            <summary
              className="
                cursor-pointer list-none border-b guide-line bg-tech-main/5 px-4
                py-2 font-mono text-xs text-tech-main/70
              ">
              SOURCE_
            </summary>
            {content?.trim() ? (
              <pre className="p-6 font-mono text-sm/relaxed whitespace-pre-wrap">
                {content}
              </pre>
            ) : (
              <p className="p-6 font-mono text-xs text-tech-main/40">
                NOTHING_TO_PREVIEW_
              </p>
            )}
          </details>
        </div>
      </div>
    </BrutalCard>
  )
}
