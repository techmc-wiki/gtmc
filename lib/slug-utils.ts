export function encodeSlug(slug: string): string {
  return slug.split("/").map(encodeURIComponent).join("/")
}

export function decodeSlugPath(segments: string[]): string {
  return segments.map(decodeURIComponent).join("/")
}

export function getSlugTail(slug: string): string {
  return slug.split("/").pop() ?? slug
}
