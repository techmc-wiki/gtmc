import React, { useMemo } from 'react'
import { diffWords } from 'diff'

export function InlineDiff({
  currentText,
  incomingText,
  mode,
}: {
  currentText: string
  incomingText: string
  mode: 'current' | 'incoming'
}) {
  const diffs = useMemo(() => diffWords(incomingText, currentText), [currentText, incomingText])

  return (
    <pre className="font-mono text-sm/relaxed whitespace-pre-wrap">
      {diffs.map((part, index) => {
        if (mode === 'current') {
          // current mode: showing what we have that incoming doesn't
          if (part.added) {
            return (
              <span key={index} className="
                bg-blue-300/40 font-medium text-blue-900
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
              <span key={index} className="
                bg-green-400/40 font-medium text-green-900
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
