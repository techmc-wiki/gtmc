export function formatErrorMessage(action: string, error: unknown): string {
  const detail = error instanceof Error ? error.message : "Unknown error"
  return `${action}: ${detail}`
}
