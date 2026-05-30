export type RetryErrorAction<TResult> =
  | { type: "return"; value: TResult }
  | { type: "retry" }
  | { type: "throw"; error?: unknown }

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function executeWithRetry<TResult>(params: {
  retries: number
  operation: () => Promise<TResult>
  onError: (
    error: unknown,
    attempt: number,
    retries: number
  ) => RetryErrorAction<TResult>
  getBackoffMs?: (attempt: number) => number
}): Promise<TResult> {
  const { retries, operation, onError, getBackoffMs } = params

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop -- retry logic: each attempt must complete before the next
      return await operation()
    } catch (error) {
      const action = onError(error, attempt, retries)

      if (action.type === "return") {
        return action.value
      }

      if (action.type === "throw") {
        throw action.error ?? error
      }

      if (attempt < retries - 1) {
        const backoffMs = getBackoffMs?.(attempt) ?? 0
        if (backoffMs > 0) {
          // eslint-disable-next-line no-await-in-loop -- retry logic: backoff delay between attempts
          await sleep(backoffMs)
        }
      }
    }
  }

  throw new Error("executeWithRetry exhausted without return or throw")
}
