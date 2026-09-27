// Leave room for multipart FormData overhead.
export const UPLOAD_SAFE_LIMIT_BYTES = 4.3 * 1024 * 1024

// Compress early enough for the compressor to reach the safe limit.
export const COMPRESS_TRIGGER_BYTES = 3.5 * 1024 * 1024

export const COMPRESS_TARGET_MB = 4.0

export const IMAGE_MAX_BYTES = 15 * 1024 * 1024

export const FILE_MAX_BYTES = 50 * 1024 * 1024
