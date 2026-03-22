// import imageCompression from "browser-image-compression";

// Vercel serverless function hard payload limit (4.5 MB)
export const VERCEL_PAYLOAD_LIMIT_BYTES = 4.5 * 1024 * 1024

// Safe upload limit with FormData overhead headroom
export const UPLOAD_SAFE_LIMIT_BYTES = 4.3 * 1024 * 1024

// Start compressing above this threshold to leave room for compression
export const COMPRESS_TRIGGER_BYTES = 3.5 * 1024 * 1024

// Target size (MB) for compression — maps to browser-image-compression maxSizeMB
export const COMPRESS_TARGET_MB = 4.0

export interface CompressionResult {
  file: File
  compressed: boolean
  error?: string
}

export async function compressImageForUpload(
  file: File,
): Promise<CompressionResult> {
  const imageCompression = (await import("browser-image-compression"))
    .default

  // GIF bypass — compressing GIFs destroys animation
  if (file.type === "image/gif") {
    if (file.size > UPLOAD_SAFE_LIMIT_BYTES) {
      return {
        file,
        compressed: false,
        error:
          "Image is too large to upload. GIF files over 4.3 MB cannot be compressed. Please resize it manually.",
      }
    }
    return { file, compressed: false }
  }

  // No compression needed for small files
  if (file.size <= COMPRESS_TRIGGER_BYTES) {
    return { file, compressed: false }
  }

  // Compress the file
  try {
    const compressedBlob = await imageCompression(file, {
      maxSizeMB: COMPRESS_TARGET_MB,
      maxWidthOrHeight: 4096,
      useWebWorker: true,
      preserveExif: false,
      initialQuality: 0.8,
      maxIteration: 15,
    })

    // Rewrap compressed result as File with preserved metadata
    const compressed = new File([compressedBlob], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    })

    // Still too large after compression (library is best-effort)
    if (compressed.size > UPLOAD_SAFE_LIMIT_BYTES) {
      return {
        file: compressed,
        compressed: true,
        error:
          "Image is too large to upload even after compression. Please resize it below 4.3 MB.",
      }
    }

    // Compression made the file larger (e.g. already well-optimized PNG) — use original
    if (compressed.size >= file.size) {
      return { file, compressed: false }
    }

    return { file: compressed, compressed: true }
  } catch {
    // Compression failed — fall back to original if it fits, otherwise error
    if (file.size > UPLOAD_SAFE_LIMIT_BYTES) {
      return {
        file,
        compressed: false,
        error:
          "Image is too large to upload. Compression failed, and the original exceeds the size limit.",
      }
    }
    return { file, compressed: false }
  }
}
