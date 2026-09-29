"use client"

export const SITE_SCROLL_ROOT_ID = "site-scroll-root"

function getSiteScrollRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null
  return document.getElementById(SITE_SCROLL_ROOT_ID)
}

export function getSiteScrollMetrics() {
  const root = getSiteScrollRoot()
  if (root) {
    return {
      clientHeight: root.clientHeight,
      scrollHeight: root.scrollHeight,
      scrollTop: root.scrollTop,
    }
  }

  return {
    clientHeight: window.innerHeight,
    scrollHeight: document.body.scrollHeight,
    scrollTop: window.scrollY,
  }
}

export function getSiteScrollProgress() {
  const { clientHeight, scrollHeight, scrollTop } = getSiteScrollMetrics()
  const docHeight = scrollHeight - clientHeight
  return docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0
}

export function addSiteScrollListener(
  listener: EventListener,
  options?: AddEventListenerOptions
) {
  const target = getSiteScrollRoot() ?? window

  target.addEventListener("scroll", listener, options)

  return () => target.removeEventListener("scroll", listener, options)
}
