import path from "node:path"

import { generatePdfHtml } from "@gtmc/ssg"
import { createLogger, describeError } from "./lib/logger"

const logger = createLogger("pdf-html")
generatePdfHtml({
  dataDir: path.join(process.cwd(), "data"),
  htmlDir: path.join(process.cwd(), "data", "pdf-html"),
  highlightCachePath: path.join(process.cwd(), "data", ".shiki-cache.json"),
  logger,
}).catch((error: unknown) => {
  logger.error("pdf-html.failed", {}, describeError(error))
  process.exitCode = 1
})
