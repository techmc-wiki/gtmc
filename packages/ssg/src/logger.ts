type LogAttributes = Record<string, boolean | number | string | undefined>

export interface BuildLogger {
  event(event: string, attributes?: LogAttributes, detail?: string): void
  warn(event: string, attributes?: LogAttributes, detail?: string): void
  error(event: string, attributes?: LogAttributes, detail?: string): void
}
