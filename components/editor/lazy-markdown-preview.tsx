import dynamic from "next/dynamic"

interface LazyMarkdownPreviewProps {
  content: string
  rawPath?: string
}

export const LazyMarkdownPreview = dynamic<LazyMarkdownPreviewProps>(
  () =>
    import("@/components/editor/markdown-preview").then(
      (mod) => mod.MarkdownPreview
    ),
  {
    ssr: false,
    loading: () => <p className="editor-panel">LOADING_PREVIEW_</p>,
  }
)
