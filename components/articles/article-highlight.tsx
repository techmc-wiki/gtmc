"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"

function performHighlight(query: string, containerSelector: string) {
  const container = document.querySelector(containerSelector)
  if (!container) return

  const lowerQuery = query.toLowerCase()
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  )

  let targetNode: Text | null = null
  let matchIndex = -1

  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text
    const text = textNode.textContent?.toLowerCase() ?? ""
    const idx = text.indexOf(lowerQuery)
    if (idx !== -1) {
      targetNode = textNode
      matchIndex = idx
      break
    }
  }

  if (!targetNode || matchIndex === -1) return

  const parent = targetNode.parentNode
  if (!parent) return

  const originalText = targetNode.textContent ?? ""
  const before = originalText.slice(0, matchIndex)
  const matched = originalText.slice(matchIndex, matchIndex + query.length)
  const after = originalText.slice(matchIndex + query.length)

  const mark = document.createElement("mark")
  mark.textContent = matched
  mark.style.cssText =
    "background-color: rgb(96 112 143); color: white; padding: 2px 4px; transition: all 2.4s cubic-bezier(0.4, 0, 0.2, 1);"

  const fragment = document.createDocumentFragment()
  if (before) fragment.appendChild(document.createTextNode(before))
  fragment.appendChild(mark)
  if (after) fragment.appendChild(document.createTextNode(after))
  parent.replaceChild(fragment, targetNode)

  mark.scrollIntoView({ behavior: "smooth", block: "center" })

  setTimeout(() => {
    mark.style.backgroundColor = "transparent"
    mark.style.color = ""
    mark.style.padding = "0"
  }, 3600)

  setTimeout(() => {
    if (mark.parentNode) {
      const text = document.createTextNode(mark.textContent ?? "")
      mark.parentNode.replaceChild(text, mark)
      mark.parentNode?.normalize?.()
    }
  }, 6000)
}

export function ArticleHighlight({
  containerSelector = "[data-article-content]",
}: {
  containerSelector?: string
}) {
  const searchParams = useSearchParams()
  const highlightQuery = searchParams.get("highlight")
  const didHighlightRef = useRef(false)

  useEffect(() => {
    if (!highlightQuery || highlightQuery.trim().length < 2) return
    if (didHighlightRef.current) return

    const timeout = setTimeout(() => {
      if (didHighlightRef.current) return
      didHighlightRef.current = true
      performHighlight(highlightQuery.trim(), containerSelector)

      const url = new URL(window.location.href)
      url.searchParams.delete("highlight")
      window.history.replaceState(null, "", url.pathname + url.search)
    }, 300)

    return () => {
      clearTimeout(timeout)
    }
  }, [highlightQuery, containerSelector])

  useEffect(() => {
    const handleHighlightEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ query: string }>
      if (customEvent.detail?.query) {
        performHighlight(customEvent.detail.query, containerSelector)
      }
    }

    window.addEventListener("highlight-search", handleHighlightEvent)
    return () => {
      window.removeEventListener("highlight-search", handleHighlightEvent)
    }
  }, [containerSelector])

  return null
}
