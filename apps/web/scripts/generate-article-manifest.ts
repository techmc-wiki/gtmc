import path from "node:path"
import { generateArticleManifest } from "@gtmc/ssg"
import { getArticlesCommitUrl } from "@/lib/github/repos"
import { workspacePath } from "@/lib/workspace-paths"
import { createLogger, describeError } from "./lib/logger"

const logger = createLogger("manifest")
generateArticleManifest({
  articlesPath: workspacePath("content", "articles"),
  dataDir: path.join(process.cwd(), "data"),
  configDir: path.join(process.cwd(), "lib", "articles", "config"),
  getArticlesCommitUrl,
  logger,
}).catch((error: unknown) => {
  logger.error("manifest.failed", {}, describeError(error))
  process.exitCode = 1
})
