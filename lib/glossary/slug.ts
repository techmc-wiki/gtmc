export function generateSlug(englishTerm: string): string {
  const slug = englishTerm
    .replace(/\*+$/, "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .replaceAll(/\s+/g, "-")
    .replaceAll(/-{2,}/g, "-")
    .replaceAll(/^-+|-+$/g, "")
  return slug || "term"
}

export function generateUniqueSlug(
  englishTerm: string,
  used: Set<string>
): string {
  const base = generateSlug(englishTerm)
  if (!used.has(base)) {
    used.add(base)
    return base
  }
  let counter = 2
  while (used.has(`${base}-${counter}`)) {
    counter++
  }
  const unique = `${base}-${counter}`
  used.add(unique)
  return unique
}
