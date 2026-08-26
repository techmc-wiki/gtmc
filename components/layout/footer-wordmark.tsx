"use client"

import * as React from "react"
import { ParticleObject } from "@/components/canvasui/ParticleObject"

export function FooterWordmark() {
  const [isDark, setIsDark] = React.useState(false)

  React.useEffect(() => {
    const root = document.documentElement
    const update = () => setIsDark(root.dataset.theme === "dark")
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })
    return () => observer.disconnect()
  }, [])
  const particleText = "Graduate Texts in Minecraft"

  const src = React.useMemo(() => {
    const fill = isDark ? "#e7ecf4" : "#20283c"
    const svgWidth = Math.max(1000, Math.ceil(particleText.length * 130 + 300))
    const svgHeight = 240
    const fontSize = 190
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}"><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="STIX Two Text, Noto Serif SC, Georgia, serif" font-size="${fontSize}" font-weight="200" fill="${fill}">${particleText}</text></svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  }, [isDark, particleText])

  return (
    <div
      aria-hidden="true"
      className="bg-tech-bg @container relative w-full overflow-hidden select-none">
      <div className="relative h-[28cqw] max-h-85 min-h-47.5 w-full">
        {/* Static fallback — faint watermark when WebGL is unavailable, full-width like original */}
        <p className="display-title text-tech-main/15 pointer-events-none absolute inset-0 flex translate-y-[7%] items-center justify-center text-center text-[31cqw] leading-[0.78] tracking-[-0.03em] whitespace-nowrap select-none">
          GTMC
        </p>
        <ParticleObject
          src={src}
          count={20000}
          size={2}
          sizeVariance={0.2}
          scale={12}
          floatIntensity={1}
          rotationIntensity={0.45}
          floatSpeed={1.6}
          fov={15}
          cameraDistance={12}
          className="h-full w-full"
        />
      </div>
    </div>
  )
}
