import { pangu } from "pangu"
import { createRehypeCJKSpacing } from "./rehype-cjk-spacing-base"

/**
 * Rehype plugin that adds spacing between CJK and half-width characters
 * using pangu.js. Skips text inside code and pre elements.
 */
export const rehypeCJKSpacing = createRehypeCJKSpacing(
  pangu.spacingText.bind(pangu)
)
