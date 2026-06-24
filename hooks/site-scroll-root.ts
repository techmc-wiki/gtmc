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

export function addSiteScrollListener(
  listener: EventListener,
  options?: AddEventListenerOptions
) {
  const target = getSiteScrollRoot() ?? window

  target.addEventListener("scroll", listener, options)

  return () => target.removeEventListener("scroll", listener, options)
}
