import {
  createConsola,
  type ConsolaReporter,
  type LogObject,
} from "consola/basic"
import { formatWithOptions } from "node:util"
import pc from "picocolors"

type LogValue = boolean | number | string | undefined
export type LogAttributes = Record<string, LogValue>

function formatPrefix(tag: string): string {
  const scope = tag.replace(/^gtmc:/, "")
  return pc.bold(`gtmc:${scope}`)
}

function formatLevel(log: LogObject): string {
  if (log.type === "error" || log.type === "fatal") return pc.red("ERROR")
  if (log.type === "warn") return pc.yellow("WARN ")
  return pc.dim("INFO ")
}

function indentDetail(message: string): string {
  return message.replaceAll("\n", "\n  ")
}

const reporter: ConsolaReporter = {
  log(log, { options }): void {
    const stream =
      log.type === "error" || log.type === "warn"
        ? (options.stderr ?? process.stderr)
        : (options.stdout ?? process.stdout)
    const message = indentDetail(
      formatWithOptions(options.formatOptions, ...log.args)
    )
    stream.write(`${formatLevel(log)} ${formatPrefix(log.tag)}  ${message}\n`)
  },
}

const consola = createConsola({
  formatOptions: { date: false },
  reporters: [reporter],
})

/**
 * Build logs are a compact event stream: record stage boundaries, decisions,
 * durable outputs, and actionable degradation or failure. Event names stay
 * stable; variable context is emitted as attributes; item-by-item detail is
 * opt-in rather than part of the default build transcript.
 */

function formatValue(value: Exclude<LogValue, undefined>): string {
  const formatted =
    typeof value === "string" && /\s/.test(value)
      ? JSON.stringify(value)
      : String(value)
  return pc.dim(formatted)
}

function formatEventName(event: string): string {
  if (event.endsWith(".failed")) return pc.red(event)
  if (event.endsWith(".skipped") || event.endsWith(".unavailable")) {
    return pc.yellow(event)
  }
  if (event.endsWith(".completed") || event.endsWith(".generated")) {
    return pc.green(event)
  }
  if (event.endsWith(".started")) return pc.cyan(event)
  return pc.bold(event)
}

function formatEvent(
  event: string,
  attributes: LogAttributes,
  detail?: string
): string {
  const attributeText = Object.entries(attributes)
    .filter(([, value]) => value !== undefined)
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${pc.dim(key)}=${formatValue(value!)}`)
    .join(" ")
  const message = attributeText
    ? `${formatEventName(event)} ${attributeText}`
    : formatEventName(event)

  return detail ? `${message}\n${detail.trim()}` : message
}

export function createLogger(scope: string) {
  const scopedConsola = consola.withTag(`gtmc:${scope}`)

  return {
    event: (
      event: string,
      attributes: LogAttributes = {},
      detail?: string
    ): void => scopedConsola.info(formatEvent(event, attributes, detail)),
    warn: (
      event: string,
      attributes: LogAttributes = {},
      detail?: string
    ): void => scopedConsola.warn(formatEvent(event, attributes, detail)),
    error: (
      event: string,
      attributes: LogAttributes = {},
      detail?: string
    ): void => scopedConsola.error(formatEvent(event, attributes, detail)),
  }
}

export type BuildLogger = ReturnType<typeof createLogger>

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Emit one bounded stage lifecycle with a duration and a single failure event. */
export function runBuildStep<T>(
  logger: BuildLogger,
  stage: string,
  action: () => T,
  attributes: LogAttributes = {}
): T {
  const startedAt = performance.now()
  logger.event("stage.started", { ...attributes, stage })

  try {
    const result = action()
    logger.event("stage.completed", {
      ...attributes,
      duration_ms: Math.round(performance.now() - startedAt),
      stage,
    })
    return result
  } catch (error) {
    logger.error(
      "stage.failed",
      {
        ...attributes,
        duration_ms: Math.round(performance.now() - startedAt),
        stage,
      },
      describeError(error)
    )
    throw error
  }
}
