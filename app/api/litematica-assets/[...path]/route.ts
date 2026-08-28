import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const BASE_MINECRAFT_DIR = path.join(
  process.cwd(),
  "litematica-renderer",
  "assets",
  "minecraft"
)

interface LitematicaAsset {
  content: Buffer
  contentType: string
}

async function createAssetIndex(): Promise<{
  assetFiles: Map<string, LitematicaAsset>
  textureFilePaths: Map<string, string>
}> {
  const assetFiles = new Map<string, LitematicaAsset>()
  const textureFilePaths = new Map<string, string>()

  const indexDirectory = async (dir: string): Promise<void> => {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    /* oxlint-disable eslint/no-await-in-loop -- preserves first-match asset lookup order */
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await indexDirectory(fullPath)
        continue
      }

      const relativePath = path
        .relative(BASE_MINECRAFT_DIR, fullPath)
        .replaceAll(path.sep, "/")
      const content = await fs.promises.readFile(fullPath)
      const contentType =
        relativePath.endsWith(".json") || relativePath.endsWith(".mcmeta")
          ? "application/json"
          : "image/png"

      assetFiles.set(relativePath, { content, contentType })
      if (
        relativePath.startsWith("textures/") &&
        !textureFilePaths.has(entry.name)
      ) {
        textureFilePaths.set(entry.name, relativePath)
      }
    }
    /* oxlint-enable eslint/no-await-in-loop */
  }

  try {
    await indexDirectory(BASE_MINECRAFT_DIR)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error
    }
  }

  return { assetFiles, textureFilePaths }
}

const { assetFiles: ASSET_FILES, textureFilePaths: TEXTURE_FILE_PATHS } =
  await createAssetIndex()

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  // 在较新的 Next.js 里 params 可能是个 Promise
  const params = await context.params
  const pathArray = params.path

  if (!pathArray || pathArray.length === 0) {
    return new NextResponse("Not Found", { status: 404 })
  }

  const assetPath = pathArray.join("/")
  const fileName = pathArray[pathArray.length - 1]

  const normalizedAssetPath = path.normalize(assetPath).replaceAll("\\", "/")
  if (
    normalizedAssetPath === ".." ||
    normalizedAssetPath.startsWith("../") ||
    normalizedAssetPath.split("/").includes("..") ||
    path.isAbsolute(normalizedAssetPath)
  ) {
    return new NextResponse("Forbidden", { status: 403 })
  }
  let relativeTarget: string | null = null

  // 允许直接以 models/block/xxx.json 或者 textures/block/xxx.png 访问
  if (ASSET_FILES.has(normalizedAssetPath)) {
    relativeTarget = normalizedAssetPath
  } else {
    // 后备：旧逻辑直接查找 block/xxx 目录
    const directTarget = path.posix.join(
      "textures",
      "block",
      normalizedAssetPath
    )
    if (ASSET_FILES.has(directTarget)) {
      relativeTarget = directTarget
    } else {
      // 否则从模块加载时建立的全局索引中查找
      relativeTarget = TEXTURE_FILE_PATHS.get(fileName) ?? null
    }
  }

  if (!relativeTarget) {
    return new NextResponse("Asset Not Found", { status: 404 })
  }

  if (
    path.isAbsolute(relativeTarget) ||
    relativeTarget === ".." ||
    relativeTarget.startsWith(".." + path.sep)
  ) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const asset = ASSET_FILES.get(relativeTarget)
  if (!asset) {
    return new NextResponse("Asset Not Found", { status: 404 })
  }

  return new NextResponse(new Uint8Array(asset.content), {
    headers: {
      "Content-Type": asset.contentType,
      // 设置超长缓存，优化连续请求以及 Three.js Texture 加载速度
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
