import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

// 全局缓存以加速递归查找
const fileCache: Record<string, string> = {}

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

  // 基础资产目录
  const baseMinecraftDir = path.join(
    process.cwd(),
    "litematica-renderer",
    "assets",
    "minecraft"
  )

  const baseAssetsDir = path.join(baseMinecraftDir, "textures")

  // 递归查找文件函数
  const findFile = async (
    dir: string,
    targetName: string
  ): Promise<string | null> => {
    if (fileCache[targetName]) {
      return fileCache[targetName] // 若有缓存则直接返回
    }
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const found = await findFile(fullPath, targetName)
        if (found) return found
      } else if (entry.name === targetName) {
        fileCache[targetName] = fullPath // 计入缓存
        return fullPath
      }
    }
    return null
  }

  let localTarget: string | null = null

  // 允许直接以 models/block/xxx.json 或者 textures/block/xxx.png 访问
  const explicitTarget = path.join(baseMinecraftDir, assetPath)
  if (fs.existsSync(explicitTarget)) {
    localTarget = explicitTarget
  } else {
    // 后备：旧逻辑直接查找 block/xxx 目录
    const directTarget = path.join(baseAssetsDir, "block", assetPath)
    if (fs.existsSync(directTarget)) {
      localTarget = directTarget
    } else {
      // 否则我们在整个 textures 目录中进行全局搜索
      localTarget = await findFile(baseAssetsDir, fileName)
    }
  }

  if (!localTarget) {
    return new NextResponse("Asset Not Found", { status: 404 })
  }

  // 安全检查：防止路径穿越攻击
  if (!localTarget.startsWith(baseMinecraftDir)) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  try {
    const fileBuffer = await fs.promises.readFile(localTarget)

    let contentType = "image/png"
    if (localTarget.endsWith(".json")) contentType = "application/json"
    if (localTarget.endsWith(".mcmeta")) contentType = "application/json"

    return new NextResponse(fileBuffer, {
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
