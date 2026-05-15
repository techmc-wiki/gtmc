// ---------------------------------------------------------------------------
// Git blob mode
// ---------------------------------------------------------------------------

export const GIT_BLOB_MODE = "100644" as const

// ---------------------------------------------------------------------------
// GitHub comment/issue body marker strings
// ---------------------------------------------------------------------------

export const EXPLANATION_MARKER = "<!-- GTMC_EXPLANATION"
export const EXPLANATION_END = "-->"
export const METADATA_MARKER = "<!-- GTMC_METADATA"
export const METADATA_END = "-->"
export const SYSTEM_COMMENT_MARKER = "<!-- GTMC_SYSTEM_ASSIGNMENT -->"

// ---------------------------------------------------------------------------
// Compatible aliases (for metadata.ts naming convention)
// ---------------------------------------------------------------------------

export const EXPLANATION_START = EXPLANATION_MARKER
export const METADATA_START = METADATA_MARKER
