import fs from "fs";
import path from "path";

import { getArticleManifest } from "@/lib/articles/manifest";
import { workspacePath } from "@/lib/workspace-paths";

export const ARTICLES_PATH = workspacePath("content", "articles");

export async function resolveLocalArticlePath(slugPath: string): Promise<string | null> {
  const manifestPath = await resolveFromManifest(slugPath);
  if (manifestPath) return manifestPath;

  return resolveRawArticlePath(slugPath);
}

async function resolveFromManifest(slugPath: string): Promise<string | null> {
  const manifest = await getArticleManifest();

  if (manifest[slugPath] !== undefined) {
    return manifest[slugPath].filePath;
  }

  if (manifest[`${slugPath}.md`] !== undefined) {
    return manifest[`${slugPath}.md`].filePath;
  }

  return null;
}

function resolveRawArticlePath(slugPath: string): string | null {
  const normalizedPath = decodeURIComponent(slugPath);

  if (fs.existsSync(path.join(ARTICLES_PATH, normalizedPath))) {
    return normalizedPath;
  }

  const withExt = `${normalizedPath}.md`;
  if (fs.existsSync(path.join(ARTICLES_PATH, withExt))) {
    return withExt;
  }

  return null;
}
