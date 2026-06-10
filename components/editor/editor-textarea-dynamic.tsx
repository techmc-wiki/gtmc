import dynamic from "next/dynamic"

export const EditorTextareaDynamic = dynamic(
  () =>
    import("@/components/editor/editor-textarea").then(
      (mod) => mod.EditorTextarea
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-md bg-muted" />
    ),
  }
)
