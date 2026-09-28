/**
 * Page geometry, shared so the renderer and the asset pipeline agree on how
 * much room an image is allowed.
 *
 * The renderer does not scale replaced elements: `max-width` and `max-height`
 * are ignored on `<img>`, so an image is embedded at its intrinsic pixel size
 * and can run across several pages. Sizes are therefore computed here and
 * written onto the tag as explicit `width`/`height` attributes, which the
 * renderer does honour.
 */

/** A4 at 96 dpi, the density the renderer works in. */
export const PAGE_WIDTH = 794
export const PAGE_HEIGHT = 1123

export const MARGIN = {
  top: 56,
  right: 60,
  bottom: 64,
  left: 60,
} as const

/** Width available to body copy, figures, and tables. */
export const COLUMN_WIDTH = PAGE_WIDTH - MARGIN.left - MARGIN.right

/** Height available between the margins. */
export const COLUMN_HEIGHT = PAGE_HEIGHT - MARGIN.top - MARGIN.bottom

/**
 * Ceiling for a single figure. The remainder leaves room for the caption and
 * keeps a figure from filling a page on its own, which reads as a plate rather
 * than as part of the argument.
 */
export const MAX_IMAGE_HEIGHT = Math.round(COLUMN_HEIGHT * 0.75)

/** Scales intrinsic pixels into the column without upscaling or distorting. */
export function fitToColumn(
  width: number,
  height: number
): {
  width: number
  height: number
} {
  if (width <= 0 || height <= 0) return { width: COLUMN_WIDTH, height: 1 }
  const scale = Math.min(1, COLUMN_WIDTH / width, MAX_IMAGE_HEIGHT / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}
