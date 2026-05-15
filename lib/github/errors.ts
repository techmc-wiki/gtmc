type GithubErrorHeaders = Record<string, string | number>

export interface GithubErrorResponse {
  status?: number
  headers?: GithubErrorHeaders
}

export interface GithubErrorFields {
  status?: number
  message?: string
  error?: string
  response?: GithubErrorResponse
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function isGithubErrorResponse(
  value: unknown
): value is GithubErrorResponse {
  if (!isRecord(value)) {
    return false
  }

  const status = value.status
  if (status !== undefined && typeof status !== "number") {
    return false
  }

  const headers = value.headers
  if (headers !== undefined && !isRecord(headers)) {
    return false
  }

  return true
}

export function isGithubError(value: unknown): value is GithubErrorFields {
  if (!isRecord(value)) {
    return false
  }

  const status = value.status
  const message = value.message
  const error = value.error
  const response = value.response

  if (status !== undefined && typeof status !== "number") {
    return false
  }

  if (message !== undefined && typeof message !== "string") {
    return false
  }

  if (error !== undefined && typeof error !== "string") {
    return false
  }

  if (response !== undefined && !isGithubErrorResponse(response)) {
    return false
  }

  return (
    status !== undefined ||
    message !== undefined ||
    error !== undefined ||
    response !== undefined
  )
}

export function getGithubErrorMessage(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined
  }

  if (typeof error.message === "string") {
    return error.message
  }

  if (typeof error.error === "string") {
    return error.error
  }

  return undefined
}

export function getGithubErrorStatus(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined
  }

  if (typeof error.status === "number") {
    return error.status
  }

  const response = error.response
  if (isGithubErrorResponse(response)) {
    return response.status
  }

  return undefined
}

export function getGithubErrorStatusNumber(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined
  }

  const status = error.status
  if (typeof status === "number") {
    return status
  }

  if (typeof status === "string") {
    const parsed = Number(status)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  const response = error.response
  if (!isRecord(response)) {
    return undefined
  }

  const responseStatus = response.status
  if (typeof responseStatus === "number") {
    return responseStatus
  }

  if (typeof responseStatus === "string") {
    const parsed = Number(responseStatus)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

export function getGithubErrorResponseHeader(
  error: unknown,
  name: string
): string | number | undefined {
  if (!isRecord(error)) {
    return undefined
  }

  const response = error.response
  if (!isRecord(response)) {
    return undefined
  }

  const headers = response.headers
  if (!isRecord(headers)) {
    return undefined
  }

  const value = headers[name]
  if (typeof value === "string" || typeof value === "number") {
    return value
  }

  return undefined
}
