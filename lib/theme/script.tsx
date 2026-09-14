"use client"

import { useServerInsertedHTML } from "next/navigation"
import { noFlashScript } from "./no-flash-script"

const NO_FLASH_HTML = { __html: noFlashScript }

/**
 * Injects the synchronous anti-flash theme script into `<head>` during SSR / prerender.
 * On client-side renders (such as locale-switching navigations), it returns `null`
 * so React 19 does not encounter or warn about client-rendered `<script>` tags.
 */
export function ThemeScript() {
  useServerInsertedHTML(() => (
    <script key="theme-no-flash" dangerouslySetInnerHTML={NO_FLASH_HTML} />
  ))
  return null
}
