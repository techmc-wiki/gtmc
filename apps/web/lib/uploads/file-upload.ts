import { FILE_MAX_BYTES, IMAGE_MAX_BYTES } from "./constants"

export type FileCategory = "images" | "videos" | "files"

interface MimeDefinition {
  category: FileCategory
  maxBytes: number
  extension: string
}

const MIME_DEFINITIONS: Partial<Record<string, MimeDefinition>> = {
  "image/jpeg": {
    category: "images",
    maxBytes: IMAGE_MAX_BYTES,
    extension: "jpg",
  },
  "image/png": {
    category: "images",
    maxBytes: IMAGE_MAX_BYTES,
    extension: "png",
  },
  "image/gif": {
    category: "images",
    maxBytes: IMAGE_MAX_BYTES,
    extension: "gif",
  },
  "image/webp": {
    category: "images",
    maxBytes: IMAGE_MAX_BYTES,
    extension: "webp",
  },
  "video/mp4": {
    category: "videos",
    maxBytes: FILE_MAX_BYTES,
    extension: "mp4",
  },
  "video/webm": {
    category: "videos",
    maxBytes: FILE_MAX_BYTES,
    extension: "webm",
  },
  "video/quicktime": {
    category: "videos",
    maxBytes: FILE_MAX_BYTES,
    extension: "mov",
  },
  "application/pdf": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
    extension: "pdf",
  },
  "application/msword": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
    extension: "doc",
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
    extension: "docx",
  },
  "application/vnd.ms-excel": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
    extension: "xls",
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
    extension: "xlsx",
  },
  "application/zip": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
    extension: "zip",
  },
  "text/plain": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
    extension: "txt",
  },
  "text/csv": {
    category: "files",
    maxBytes: FILE_MAX_BYTES,
    extension: "csv",
  },
}

export interface FileClassification {
  category: FileCategory
  maxBytes: number
  mimeType: string
}

export function classifyFile(mimeType: string): FileClassification | null {
  const definition = MIME_DEFINITIONS[mimeType]
  if (!definition) return null
  return {
    category: definition.category,
    maxBytes: definition.maxBytes,
    mimeType,
  }
}

export function isImageMime(mimeType: string): boolean {
  const definition = MIME_DEFINITIONS[mimeType]
  return definition?.category === "images"
}

export function getAllowedMimeTypes(): string[] {
  return Object.keys(MIME_DEFINITIONS)
}

export function sanitizeFilename(
  originalName: string,
  mimeType: string
): string {
  const lastDot = originalName.lastIndexOf(".")
  let basename = lastDot > 0 ? originalName.substring(0, lastDot) : originalName

  // Prefer the allowlisted MIME extension over a client-supplied extension.
  const ext =
    MIME_DEFINITIONS[mimeType]?.extension ||
    (lastDot > 0 ? originalName.substring(lastDot + 1).toLowerCase() : "bin")

  basename = basename
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^a-zA-Z0-9._-]/g, "")
    .substring(0, 80)

  if (!basename) {
    const definition = MIME_DEFINITIONS[mimeType]
    basename = definition ? definition.category.replace(/s$/, "") : "file"
  }

  // The timestamp prefix reduces collisions between sanitized filenames.
  return `${Date.now()}-${basename}.${ext}`
}
