/**
 * Cached bounding-rect reader, matching Canvas UI's internal
 * `rect-cache` helper: avoids layout thrash from per-pointermove
 * `getBoundingClientRect` calls by invalidating on resize/scroll.
 */
export interface RectCache {
  /** Latest cached DOMRect for the target element. */
  readonly current: DOMRect
  /** Stop observing and release listeners. */
  destroy: () => void
}

export function createRectCache(element: HTMLElement): RectCache {
  let rect = element.getBoundingClientRect()

  const refresh = () => {
    rect = element.getBoundingClientRect()
  }

  const observer = new ResizeObserver(refresh)
  observer.observe(element)
  window.addEventListener("resize", refresh, { passive: true })
  window.addEventListener("scroll", refresh, { passive: true, capture: true })

  return {
    get current() {
      return rect
    },
    destroy() {
      observer.disconnect()
      window.removeEventListener("resize", refresh)
      window.removeEventListener("scroll", refresh, { capture: true })
    },
  }
}
