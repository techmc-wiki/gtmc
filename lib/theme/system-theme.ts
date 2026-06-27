import type { ResolvedTheme } from "./types"

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === "undefined") return null
  return window.matchMedia("(prefers-color-scheme: dark)")
}

function snapshot(): ResolvedTheme {
  const mq = getMediaQuery()
  if (!mq) return "light"
  return mq.matches ? "dark" : "light"
}

function subscribe(callback: () => void): () => void {
  const mq = getMediaQuery()
  if (!mq) return () => {}

  const onChange = () => {
    callback()
  }
  mq.addEventListener("change", onChange)
  return () => {
    mq.removeEventListener("change", onChange)
  }
}

export function subscribeSystemTheme(onStoreChange: () => void): () => void {
  return subscribe(onStoreChange)
}

export function getSystemThemeSnapshot(): ResolvedTheme {
  return snapshot()
}

export function getSystemThemeServerSnapshot(): ResolvedTheme {
  return "light"
}
