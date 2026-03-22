import React, { useState } from "react"

export function UnchangedBlock({
  content,
  onChange,
}: {
  content: string
  onChange: (val: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  // Split properly, handling both \r\n, \n, and old mac \r
  const contentFixed = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = contentFixed.split("\n")

  if (lines.length <= 12 || expanded) {
    return (
      <textarea
        className="
          w-full resize-y bg-transparent p-2 font-mono text-sm
          text-tech-main-dark/70 outline-none
          focus:bg-tech-main/5
        "
        rows={Math.max(2, lines.length + 1)}
        value={content}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  const headLines = lines.slice(0, 3)
  const tailLines = lines.slice(-3)
  const hiddenCount = lines.length - 6

  return (
    <div
      className="
        flex flex-col border-y border-dashed guide-line bg-tech-main/5 font-mono
        text-sm text-tech-main-dark/60
      ">
      <pre className="bg-transparent p-2 whitespace-pre-wrap">
        {headLines.join("\n")}
      </pre>
      <div
        className="
          mx-4 my-1 cursor-pointer rounded-sm bg-tech-main/10 px-4 py-2
          text-center text-xs font-bold tracking-widest text-tech-main uppercase
          transition-colors
          hover:bg-tech-main/20
        "
        onClick={() => setExpanded(true)}>
        <span className="mr-2">?</span>
        {hiddenCount} UNCHANGED LINES HIDDEN. CLICK TO EXPAND & EDIT
        <span className="ml-2">?</span>
      </div>
      <pre className="bg-transparent p-2 whitespace-pre-wrap">
        {tailLines.join("\n")}
      </pre>
    </div>
  )
}
