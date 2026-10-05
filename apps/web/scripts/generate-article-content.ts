import path from "node:path"
import { generateArticleContent } from "@gtmc/ssg"
import { workspacePath } from "@/lib/workspace-paths"
import { createLogger, describeError } from "./lib/logger"

const logger = createLogger("article-content")
generateArticleContent({
  articlesPath: workspacePath("content", "articles"),
  dataDir: path.join(process.cwd(), "data"),
  articleAssetDir: path.join(process.cwd(), "public", "article-assets"),
  production: process.env.NODE_ENV !== "development",
  logger,
}).catch((error: unknown) => {
  logger.error("article-content.failed", {}, describeError(error))
  process.exitCode = 1
})
