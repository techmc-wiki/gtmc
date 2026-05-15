// lib/file-upload.ts

import {
  FILE_MAX_BYTES,
  IMAGE_MAX_BYTES,
  VERCEL_BODY_LIMIT_BYTES,
} from "./upload-constants"
export { VERCEL_BODY_LIMIT_BYTES }

// ---------------------------------------------------------------------------
// MIME allowlist and category classification
// ---------------------------------------------------------------------------

export type FileCategory = "images" | "videos" | "files"

interface MimeConfig {
  category: FileCategory
  maxBytes: number
  proxyable: boolean
}

const MIME_ALLOWLIST: Record<string, MimeConfig> = {
  // Images — 15 MB
  "image/jpeg": {
    category: "images",
    maxBytes: IMAGE_MAX_BYTES,
    proxyable: false,
  },
  "image/png": {
    category: "images",
    maxBytes: IMAGE_MAX_BYTES,
    proxyable: false,
  },
  "image/gif": {
    category: "images",
    maxBytes: IMAGE_MAX_BYTES,
    proxyable: false,
  },
  "image/webp": {
    category: "images",
    maxBytes: IMAGE_MAX_BYTES,
    proxyable: false,
  },
  // Videos — 50 MB
  "video/mp4": {
    category: "videos",
    maxBytes: FILE_MAX_BYTES,
    proxyable: true,
  },
  "video/webm": {
    category: "videos",
    maxBytes: FILE_MAX_BYTES,
    proxyable: true,
  },
  "video/quicktime": {
    category: "videos",
    maxBytes: FILE_MAX_BYTES,
    proxyable: false,
  },
  // Files — 50 MB
  "application/pdf": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
    proxyable: true,
  },
  "application/msword": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
    proxyable: false,
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
    proxyable: false,
  },
  "application/vnd.ms-excel": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
    proxyable: false,
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
    proxyable: false,
  },
  "application/zip": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
    proxyable: false,
  },
  "text/plain": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
    proxyable: false,
  },
  "text/csv": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
    proxyable: false,
  },
}

// MIME types that the proxy route can serve inline
export const PROXY_INLINE_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "application/pdf",
])

// MIME-to-extension mapping for filename sanitization
const MIME_TO_EXT: Record<string, string> = {
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
  proxyable: boolean
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

export function getNonImageMimeTypes(): string[] {
  return Object.keys(MIME_ALLOWLIST).filter((m) => !isImageMime(m))
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
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .substring(0, 80)

  // Fallback for empty basename
  if (!basename) {
    const config = MIME_ALLOWLIST[mimeType]
    basename = config ? config.category.replace(/s$/, "") : "file"
  }

  // Prepend timestamp for uniqueness
  return `${Date.now()}-${basename}.${ext}`
}

// ---------------------------------------------------------------------------
// Markdown block generation
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function generateMarkdownBlock(
  filename: string,
  rawGithubUrl: string,
  mimeType: string,
  fileSize: number
): string {
  const classification = classifyFile(mimeType)
  if (!classification) return `[${filename}](${rawGithubUrl})`

  const displayName = filename.replace(/^\d+-/, "") // Strip timestamp prefix for display
  const sizeStr = formatFileSize(fileSize)

  // Images: standard markdown image
  if (classification.category === "images") {
    return `![${displayName}](${rawGithubUrl})`
  }

  // Extract the storage path from the raw URL for proxy
  // raw URL: https://raw.githubusercontent.com/OWNER/REPO/main/data/videos/filename.mp4
  // proxy path: data/videos/filename.mp4
  const pathMatch = rawGithubUrl.match(/\/main\/(.+)$/)
  const storagePath = pathMatch ? pathMatch[1] : null

  const emoji = classification.category === "videos" ? "🎬" : "📎"

  if (classification.proxyable && storagePath) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ""
    const proxyUrl = `${appUrl}/api/files/proxy?path=${encodeURIComponent(storagePath)}`
    return `${emoji} **${displayName}** (${sizeStr})\n[\[▶ View / Download\]](${proxyUrl})`
  }

  // Non-proxyable: direct download link
  return `${emoji} **${displayName}** (${sizeStr})\n[\[↓ Download\]](${rawGithubUrl})`
}
