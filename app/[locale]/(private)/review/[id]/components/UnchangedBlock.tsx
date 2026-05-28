import React, { useCallback, useState } from "react"

export function UnchangedBlock({
  content,
  onChange,
}: {
  content: string
  onChange: (val: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const contentFixed = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = contentFixed.split("\n")

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
    [onChange]
  )

  const handleExpand = useCallback(() => setExpanded(true), [])

  if (lines.length <= 12 || expanded) {
    return (
      <textarea
        className="text-tech-main-dark/70 focus:bg-tech-main/5 w-full resize-y bg-transparent p-2 font-mono text-sm outline-none"
        rows={Math.max(2, lines.length + 1)}
        value={content}
        onChange={handleChange}
        aria-label="Unchanged content block"
      />
    )
  }

  const headLines = lines.slice(0, 3)
  const tailLines = lines.slice(-3)
  const hiddenCount = lines.length - 6

  return (
    <div className="guide-line bg-tech-main/5 text-tech-main-dark/60 flex flex-col border-y border-dashed font-mono text-sm">
      <pre className="bg-transparent p-2 whitespace-pre-wrap">
        {headLines.join("\n")}
      </pre>
      <button
        type="button"
        className="bg-tech-main/10 text-tech-main hover:bg-tech-main/20 mx-4 my-1 cursor-pointer rounded-sm px-4 py-2 text-center text-xs font-bold tracking-widest uppercase transition-colors"
        onClick={handleExpand}>
        <span className="mr-2">?</span>
        {hiddenCount} UNCHANGED LINES HIDDEN. CLICK TO EXPAND & EDIT
        <span className="ml-2">?</span>
      </button>
      <pre className="bg-transparent p-2 whitespace-pre-wrap">
        {tailLines.join("\n")}
      </pre>
    </div>
  )
}
