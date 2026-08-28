import fs from "node:fs"
import path from "node:path"

import { createLogger } from "./logger"

const logger = createLogger("function-traces")
const FUNCTION_TRACE_BUDGET_BYTES = 225 * 1024 ** 2

interface FunctionTrace {
  version: number
  files: string[]
}

function readTrace(tracePath: string): FunctionTrace {
  const parsed: unknown = JSON.parse(fs.readFileSync(tracePath, "utf8"))
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    typeof parsed.version !== "number" ||
    !("files" in parsed) ||
    !Array.isArray(parsed.files) ||
    !parsed.files.every((file) => typeof file === "string")
  ) {
    throw new Error(`Invalid function trace: ${tracePath}`)
  }
  return parsed as FunctionTrace
}

function getFileSize(filePath: string): number {
  try {
    return fs.statSync(filePath).size
  } catch {
    return 0
  }
}

function getTraceSize(tracePath: string, trace: FunctionTrace): number {
  const traceDirectory = path.dirname(tracePath)
  return trace.files.reduce(
    (total, file) => total + getFileSize(path.resolve(traceDirectory, file)),
    0
  )
}

function listFunctionTraces(appServerDir: string): string[] {
  if (!fs.existsSync(appServerDir)) return []

  const traces: string[] = []
  for (const entry of fs.readdirSync(appServerDir, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (entry.isFile() && entry.name.endsWith(".nft.json")) {
      traces.push(path.join(entry.parentPath, entry.name))
    }
  }
  return traces
}

export function auditFunctionTraces(
  projectRoot = process.cwd(),
  distDir = path.join(projectRoot, ".next")
): void {
  const appServerDir = path.join(distDir, "server", "app")
  const traces = listFunctionTraces(appServerDir).map((tracePath) => {
    const trace = readTrace(tracePath)
    return {
      bytes: getTraceSize(tracePath, trace),
      route: path
        .relative(appServerDir, tracePath)
        .replaceAll(path.sep, "/")
        .replace(/\/(page|route)\.js\.nft\.json$/, "")
        .replace(/\.js\.nft\.json$/, ""),
    }
  })

  const largest = traces.toSorted((left, right) => right.bytes - left.bytes)[0]
  if (!largest) {
    throw new Error(`No function traces found under ${appServerDir}`)
  }

  logger.event("traces.audited", {
    function_count: traces.length,
    largest_mib: Number((largest.bytes / 1024 ** 2).toFixed(2)),
    largest_route: largest.route,
  })

  const overBudget = traces.filter(
    ({ bytes }) => bytes > FUNCTION_TRACE_BUDGET_BYTES
  )
  if (overBudget.length > 0) {
    const detail = overBudget
      .toSorted((left, right) => right.bytes - left.bytes)
      .map(
        ({ bytes, route }) => `${route}: ${(bytes / 1024 ** 2).toFixed(2)} MiB`
      )
      .join("\n")
    throw new Error(
      `Function trace budget exceeded (${FUNCTION_TRACE_BUDGET_BYTES / 1024 ** 2} MiB)\n${detail}`
    )
  }
}
