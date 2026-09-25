import {
  COMPRESS_TARGET_MB,
  COMPRESS_TRIGGER_BYTES,
  UPLOAD_SAFE_LIMIT_BYTES,
} from "./constants"

export interface CompressionResult {
  file: File
  compressed: boolean
  error?: string
}

export async function compressImageForUpload(
  file: File
): Promise<CompressionResult> {
  // Compressing GIFs can discard animation.
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

  if (file.size <= COMPRESS_TRIGGER_BYTES) {
    return { file, compressed: false }
  }

  const imageCompression = (await import("browser-image-compression")).default

  try {
    const compressedBlob = await imageCompression(file, {
      maxSizeMB: COMPRESS_TARGET_MB,
      maxWidthOrHeight: 4096,
      useWebWorker: true,
      preserveExif: false,
      initialQuality: 0.8,
      maxIteration: 15,
    })

    const compressed = new File([compressedBlob], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    })

    // Compression is best-effort and may miss its target size.
    if (compressed.size > UPLOAD_SAFE_LIMIT_BYTES) {
      return {
        file: compressed,
        compressed: true,
        error:
          "Image is too large to upload even after compression. Please resize it below 4.3 MB.",
      }
    }

    if (compressed.size >= file.size) {
      return { file, compressed: false }
    }

    return { file: compressed, compressed: true }
  } catch {
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
