import { ImageResponse } from "next/og"
import { type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRepoFileContent } from "@/lib/github/sync"

export const runtime = "nodejs"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  const rawPath = slug.map((s) => decodeURIComponent(s)).join("/")

  let title = "Graduate Texts in Minecraft"

  try {
    const dbArticle = await prisma.article.findUnique({
      where: { slug: rawPath },
      select: { title: true, isFolder: true },
    })
    if (dbArticle && !dbArticle.isFolder) {
      title = dbArticle.title
    }
  } catch {
    /* ignore */
  }

  if (title === "Graduate Texts in Minecraft") {
    try {
      const paths = [rawPath, `${rawPath}.md`, `${rawPath}/Preface.md`]
      for (const p of paths) {
        const content = await getRepoFileContent(p)
        if (content) {
          const match = content.match(/^#\s+(.+)$/m)
          title = match
            ? match[1].trim()
            : (rawPath.split("/").pop()?.replace(/-/g, " ") ?? title)
          break
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (title.length > 60) title = title.slice(0, 60) + "…"

  return new ImageResponse(
    <div
      style={{
        background: "#0f172a",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        padding: "60px",
      }}>
      <div
        style={{
          fontSize: 14,
          color: "#64748b",
          marginBottom: 16,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}>
        GRADUATE TEXTS IN MINECRAFT
      </div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: "#f8fafc",
          lineHeight: 1.2,
          maxWidth: 900,
        }}>
        {title}
      </div>
      <div
        style={{
          marginTop: 32,
          width: 60,
          height: 4,
          background: "#3b82f6",
        }}
      />
    </div>,
    { width: 1200, height: 630 }
  )
}
