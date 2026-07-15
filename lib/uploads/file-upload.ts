import { FILE_MAX_BYTES, IMAGE_MAX_BYTES } from "./constants"

// ---------------------------------------------------------------------------
// MIME allowlist and category classification
// ---------------------------------------------------------------------------

export type FileCategory = "images" | "videos" | "files"

interface MimeConfig {
  category: FileCategory
  maxBytes: number
}

const MIME_ALLOWLIST: Partial<Record<string, MimeConfig>> = {
  // Images — 15 MB
  "image/jpeg": {
    category: "images",
    maxBytes: IMAGE_MAX_BYTES,
  },
  "image/png": {
    category: "images",
    maxBytes: IMAGE_MAX_BYTES,
  },
  "image/gif": {
    category: "images",
    maxBytes: IMAGE_MAX_BYTES,
  },
  "image/webp": {
    category: "images",
    maxBytes: IMAGE_MAX_BYTES,
  },
  // Videos — 50 MB
  "video/mp4": {
    category: "videos",
    maxBytes: FILE_MAX_BYTES,
  },
  "video/webm": {
    category: "videos",
    maxBytes: FILE_MAX_BYTES,
  },
  "video/quicktime": {
    category: "videos",
    maxBytes: FILE_MAX_BYTES,
  },
  // Files — 50 MB
  "application/pdf": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
  },
  "application/msword": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
  },
  "application/vnd.ms-excel": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
  },
  "application/zip": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
  },
  "text/plain": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
  },
  "text/csv": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
  },
}

// MIME-to-extension mapping for filename sanitization
const MIME_TO_EXT: Partial<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/zip": "zip",
  "text/plain": "txt",
  "text/csv": "csv",
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export interface FileClassification {
  category: FileCategory
  maxBytes: number
  mimeType: string
}

export function classifyFile(mimeType: string): FileClassification | null {
  const config = MIME_ALLOWLIST[mimeType]
  if (!config) return null
  return { ...config, mimeType }
}

export function isImageMime(mimeType: string): boolean {
  const config = MIME_ALLOWLIST[mimeType]
  return config?.category === "images"
}

export function getAllowedMimeTypes(): string[] {
  return Object.keys(MIME_ALLOWLIST)
}

// ---------------------------------------------------------------------------
// Filename sanitization
// ---------------------------------------------------------------------------

export function sanitizeFilename(
  originalName: string,
  mimeType: string
): string {
  // Extract basename and extension
  const lastDot = originalName.lastIndexOf(".")
  let basename = lastDot > 0 ? originalName.substring(0, lastDot) : originalName

  // MIME-derived extension takes precedence
  const ext =
    MIME_TO_EXT[mimeType] ||
    (lastDot > 0 ? originalName.substring(lastDot + 1).toLowerCase() : "bin")

  // Sanitize basename: spaces → dashes, strip non-allowed chars, truncate
  basename = basename
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^a-zA-Z0-9._-]/g, "")
    .substring(0, 80)

  // Fallback for empty basename
  if (!basename) {
    const config = MIME_ALLOWLIST[mimeType]
    basename = config ? config.category.replace(/s$/, "") : "file"
  }

  // Prepend timestamp for uniqueness
  return `${Date.now()}-${basename}.${ext}`
}
