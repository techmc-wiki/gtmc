/** Time in milliseconds to wait before highlighting the active article after scroll */
export const HIGHLIGHT_TIMEOUT_MS = 2000

/** Time in milliseconds to disable the locate button after it's clicked */
export const LOCATE_COOLDOWN_MS = 500

/** Time in milliseconds for the locate state machine fallback (300ms animation × 2) */
export const LOCATE_FALLBACK_MS = 600

/** Height in pixels of the blur zone at the top and bottom of the sidebar */
export const BLUR_ZONE_PX = 32

/** Minimum blur value applied at the edges of the sidebar */
export const BLUR_MIN = 0.2

/** Range of blur values applied based on scroll position */
export const BLUR_RANGE = 2.8

/** Opacity fade factor applied based on scroll position */
export const OPACITY_FADE = 0.85
