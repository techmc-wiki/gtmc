import { pangu } from "pangu/browser"
import { createRehypeCJKSpacing } from "./rehype-cjk-spacing-base"

export const rehypeCJKSpacingBrowser = createRehypeCJKSpacing(
  pangu.spacingText.bind(pangu)
)
