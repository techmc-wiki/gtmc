import React, { useMemo } from "react"
import { diffWords } from "diff"

export function InlineDiff({
  currentText,
  incomingText,
  mode,
}: {
  currentText: string
  incomingText: string
  mode: "current" | "incoming"
}) {
  const diffs = useMemo(
    () => diffWords(incomingText, currentText),
    [currentText, incomingText]
  )

  return (
    <pre className="font-mono text-sm/relaxed whitespace-pre-wrap">
      {diffs.map((part, index) => {
        if (mode === "current") {
          // current mode: showing what we have that incoming doesn't
          if (part.added) {
            return (
              <span
                key={index}
                className="
                  rounded-xs border-b border-blue-400 bg-blue-300/80 px-0.5
                  font-bold text-blue-950
                ">
                {part.value}
              </span>
            )
          }
          if (part.removed) {
            // This is text unique to incoming, so current doesn't have it
            return null
          }
          return <span key={index}>{part.value}</span>
        } else {
          // incoming mode: showing what incoming has that current doesn't
          if (part.removed) {
            return (
              <span
                key={index}
                className="
                  rounded-xs border-b border-green-500 bg-green-400/80 px-0.5
                  font-bold text-green-950
                ">
                {part.value}
              </span>
            )
          }
          if (part.added) {
            // This is text unique to current, so incoming doesn't have it
            return null
          }
          return <span key={index}>{part.value}</span>
        }
      })}
    </pre>
  )
}
