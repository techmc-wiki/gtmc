import type { Root } from "hast"

import { BodyEmitter } from "./emit"
import type { EmitContext } from "./types"

export { collectAssets, type CollectedAssets } from "./assets"
export { texToTypst } from "./math"
export {
  TypstEmitError,
  type EmitContext,
  type ImageAsset,
  type MermaidAsset,
  type TypstEmitErrorDetails,
} from "./types"

/**
 * Emits the article body (no `#article` wrapper, no imports) as Typst markup.
 * Pure: the hast tree is read, never mutated, and nothing is kept between calls.
 */
export function hastToTypst(root: Root, ctx: EmitContext): string {
  return new BodyEmitter(ctx, root).blocks(root.children, root)
}
