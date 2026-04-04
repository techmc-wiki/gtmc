import dynamic from "next/dynamic"

export const LazyMarkdownPreview = dynamic(
  () =>
    import("@/components/editor/markdown-preview").then(
      (mod) => mod.MarkdownPreview
    ),
  {
    ssr: false,
    loading: () => <p className="editor-panel">LOADING_PREVIEW_</p>,
  }
)
