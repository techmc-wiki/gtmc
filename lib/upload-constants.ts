// ---------------------------------------------------------------------------
// Upload size limits
// ---------------------------------------------------------------------------

// Vercel serverless function hard payload limit (4.5 MB)
export const VERCEL_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024

// Safe upload limit with FormData overhead headroom
export const UPLOAD_SAFE_LIMIT_BYTES = 4.3 * 1024 * 1024

// Start compressing above this threshold to leave room for compression
export const COMPRESS_TRIGGER_BYTES = 3.5 * 1024 * 1024

// Target size (MB) for compression — maps to browser-image-compression maxSizeMB
export const COMPRESS_TARGET_MB = 4.0

// ---------------------------------------------------------------------------
// MIME allowlist per-category size limits
// ---------------------------------------------------------------------------

export const IMAGE_MAX_BYTES = 15 * 1024 * 1024
export const FILE_MAX_BYTES = 50 * 1024 * 1024
