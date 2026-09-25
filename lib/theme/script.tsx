"use client"

import { useServerInsertedHTML } from "next/navigation"
import { noFlashScript } from "./no-flash-script"

const NO_FLASH_HTML = { __html: noFlashScript }

/** `useServerInsertedHTML` runs only during server HTML generation, avoiding client-inserted script tags. */
export function ThemeScript() {
  useServerInsertedHTML(() => (
    <script key="theme-no-flash" dangerouslySetInnerHTML={NO_FLASH_HTML} />
  ))
  return null
}
