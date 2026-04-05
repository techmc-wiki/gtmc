"use client"

import { useEffect, useRef } from "react"
import { CornerBrackets } from "@/components/ui/corner-brackets"

interface LitematicaViewerProps {
  url: string
  height?: string | number
}

export default function LitematicaViewer({
  url,
  height = 400,
}: LitematicaViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<any>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const cleanUrl = url.replace(/\r?\n/g, "")
    let renderer: any = null

    const proxyUrl =
      "/api/litematica-download?url=" + encodeURIComponent(cleanUrl)

    const initRenderer = async () => {
      try {
        const mod = await import("schematic-renderer")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR = (mod as any).default || mod

        renderer = new SR(
          canvasRef.current!,
          {},
          {
            default: async () => {
              const res = await fetch("/pack.zip")
              return await res.blob()
            },
          },
          {
            showGrid: true,
            backgroundColor: 0xf8f9fc,
            cameraOptions: { position: [10, 10, 10] },
            callbacks: {
              onRendererInitialized: async (r: any) => {
                try {
                  // Fetch the file buffer ourselves
                  const res = await fetch(proxyUrl)
                  if (!res.ok)
                    throw new Error("Failed to fetch proxy: " + res.status)
                  const arrayBuffer = await res.arrayBuffer()

                  // Pass the ArrayBuffer to loadSchematic (fixes extension parsing issues on query str URLs)
                  const fileName =
                    cleanUrl.split("/").pop() || "schem.litematic"
                  // loadSchematic(name, buffer)
                  await r.schematicManager.loadSchematic(fileName, arrayBuffer)

                  r.cameraManager.focusOnSchematics()
                } catch (err) {
                  console.error("Error loading schematic:", err)
                }
              },
              onSchematicFileLoadFailure: (err: any) => {
                console.error("Failed to load schematic file:", err)
              },
            },
          }
        )

        rendererRef.current = renderer
      } catch (e) {
        console.error("Error setting up schematic-renderer:", e)
      }
    }

    initRenderer()

    return () => {
      if (
        rendererRef.current &&
        typeof rendererRef.current.dispose === "function"
      ) {
        rendererRef.current.dispose()
      }
    }
  }, [url])

  return (
    <div
      className="
      group relative my-8 w-full rounded-sm border-2 guide-line bg-tech-bg
      font-mono
    ">
      <CornerBrackets size="size-4" color="border-tech-main/40" />

      <canvas
        ref={canvasRef}
        className="
          block w-full cursor-pointer
          active:cursor-move
        "
        style={{ height: typeof height === "number" ? height + "px" : height }}
      />

      {/* Top Header / Badge */}
      <div
        className="
        pointer-events-none absolute top-4 left-4 flex items-center gap-3
      ">
        <span
          className="
          shrink-0 border border-tech-main/40 bg-white/70 px-2 py-0.5 text-xs
          font-bold tracking-wider text-tech-main shadow-sm backdrop-blur-sm
        ">
          [LITEMATICA]
        </span>
        <span
          className="
          hidden text-[0.625rem] tracking-widest text-tech-main/80 uppercase
          md:inline-block
        ">
          INTERACTIVE BLUEPRINT
        </span>
      </div>

      {/* Controls Guide Overlay */}
      <div
        className="
        pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2
        opacity-80 transition-opacity duration-300
        group-hover:opacity-100
      ">
        <div
          className="
          flex items-center gap-4 rounded-sm border guide-line bg-white/80 px-3
          py-1.5 text-xs whitespace-nowrap text-tech-main/80 shadow-sm
          backdrop-blur-md
        ">
          <span className="flex items-center gap-1.5">
            <kbd
              className="
              rounded-[2px] border border-tech-main/30 bg-white px-1.5 py-0.5
              font-sans text-[0.625rem] font-semibold text-tech-main shadow-sm
            ">
              左键
            </kbd>{" "}
            旋转
          </span>
          <span className="flex items-center gap-1.5 opacity-60">|</span>
          <span className="flex items-center gap-1.5">
            <kbd
              className="
              rounded-[2px] border border-tech-main/30 bg-white px-1.5 py-0.5
              font-sans text-[0.625rem] font-semibold text-tech-main shadow-sm
            ">
              右键
            </kbd>{" "}
            平移
          </span>
          <span className="flex items-center gap-1.5 opacity-60">|</span>
          <span className="flex items-center gap-1.5">
            <kbd
              className="
              rounded-[2px] border border-tech-main/30 bg-white px-1.5 py-0.5
              font-sans text-[0.625rem] font-semibold text-tech-main shadow-sm
            ">
              滚轮
            </kbd>{" "}
            缩放
          </span>
        </div>
      </div>
    </div>
  )
}
