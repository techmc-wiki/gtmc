import dynamic from "next/dynamic"
// oxlint-disable-next-line import/no-unassigned-import
import "katex/dist/katex.min.css"

interface LazyMarkdownPreviewProps {
  content: string
  rawPath?: string
}

export const LazyMarkdownPreview = dynamic<LazyMarkdownPreviewProps>(
  () => import("@/lib/markdown").then((mod) => mod.MarkdownRenderer),
  {
    ssr: false,
    loading: () => <p className="editor-panel">LOADING_PREVIEW_</p>,
  }
)
