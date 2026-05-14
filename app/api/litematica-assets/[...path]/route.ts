import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const BASE_MINECRAFT_DIR = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "litematica-renderer",
  "assets",
  "minecraft"
)
const BASE_TEXTURES_DIR = path.join(BASE_MINECRAFT_DIR, "textures")

const FILE_CACHE_LIMIT = 512
const fileCache = new Map<string, string>()

function getCachedFilePath(targetName: string) {
  const cached = fileCache.get(targetName)
  if (!cached) return null

  fileCache.delete(targetName)
  fileCache.set(targetName, cached)
  return cached
}

function setCachedFilePath(targetName: string, fullPath: string) {
  if (fileCache.has(targetName)) {
    fileCache.delete(targetName)
  }

  fileCache.set(targetName, fullPath)

  if (fileCache.size > FILE_CACHE_LIMIT) {
    const oldestKey = fileCache.keys().next().value
    if (oldestKey) {
      fileCache.delete(oldestKey)
    }
  }
}

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

  // 递归查找文件函数
  const findFile = async (
    dir: string,
    targetName: string
  ): Promise<string | null> => {
    const cachedPath = getCachedFilePath(targetName)
    if (cachedPath) {
      return cachedPath
    }
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const found = await findFile(fullPath, targetName)
        if (found) return found
      } else if (entry.name === targetName) {
        setCachedFilePath(targetName, fullPath)
        return fullPath
      }
    }
    return null
  }

  let localTarget: string | null = null

  // 允许直接以 models/block/xxx.json 或者 textures/block/xxx.png 访问
  const explicitTarget = path.join(BASE_MINECRAFT_DIR, assetPath)
  if (fs.existsSync(explicitTarget)) {
    localTarget = explicitTarget
  } else {
    // 后备：旧逻辑直接查找 block/xxx 目录
    const directTarget = path.join(BASE_TEXTURES_DIR, "block", assetPath)
    if (fs.existsSync(directTarget)) {
      localTarget = directTarget
    } else {
      // 否则我们在整个 textures 目录中进行全局搜索
      localTarget = await findFile(BASE_TEXTURES_DIR, fileName)
    }
  }

  if (!localTarget) {
    return new NextResponse("Asset Not Found", { status: 404 })
  }

  // 安全检查：防止路径穿越攻击
  if (!localTarget.startsWith(BASE_MINECRAFT_DIR)) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  try {
    const fileBuffer = await fs.promises.readFile(localTarget)

    let contentType = "image/png"
    if (localTarget.endsWith(".json")) contentType = "application/json"
    if (localTarget.endsWith(".mcmeta")) contentType = "application/json"

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": contentType,
        // 设置超长缓存，优化连续请求以及 Three.js Texture 加载速度
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return new NextResponse("Asset Not Found", { status: 404 })
  }
}
