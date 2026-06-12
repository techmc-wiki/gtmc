/**
 * Shared review logging and SHA helper utilities.
 *
 * All helpers preserve exact log prefixes and error-structuring
 * semantics from the duplicated implementations they replace.
 */

export function reviewLog(action: string, details: Record<string, unknown>) {
  console.log(`[review:${action}]`, details)
}

export function reviewError(
  action: string,
  error: unknown,
  details: Record<string, unknown>
) {
  console.error(`[review:${action}]`, {
    ...details,
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error,
  })
}

export function summarizeSha(sha?: string | null) {
  return sha ? sha.slice(0, 7) : null
}
