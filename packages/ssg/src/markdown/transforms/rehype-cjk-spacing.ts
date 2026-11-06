import { pangu } from "pangu"
import { createRehypeCJKSpacing } from "./rehype-cjk-spacing-base"

export const rehypeCJKSpacing = createRehypeCJKSpacing(
  pangu.spaceText.bind(pangu)
)
