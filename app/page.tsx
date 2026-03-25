"use client"

import { useRef, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useHomepageMotion } from "@/lib/motion/use-homepage-motion"
import { HOMEPAGE_MOTION } from "@/lib/motion/homepage-constants"
import { HideFooter } from "@/components/layout/footer-context"
import { BackgroundLayer } from "./_homepage/background-layer"
import { MidgroundLayer } from "./_homepage/midground-layer"
import { ForegroundLayer } from "./_homepage/foreground-layer"

export default function Home() {
  const router = useRouter()
  const motionDriver = useHomepageMotion()
  const [isAccessingDatabase, setIsAccessingDatabase] = useState(false)
  const [cardWidth, setCardWidth] = useState(900)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return
    }

    router.prefetch("/articles")
  }, [router])

  useEffect(() => {
    if (!cardRef.current) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCardWidth(Math.round(entry.contentRect.width))
      }
    })

    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [])

  const {
    background: bgTransform,
    midground: mgTransform,
    foreground: fgTransform,
    smoothMouseX,
    smoothMouseY,
    isReducedMotion,
  } = motionDriver

  const bgBlurMax = isReducedMotion ? 0 : HOMEPAGE_MOTION.blurMax.background
  const mgBlurMax = isReducedMotion ? 0 : HOMEPAGE_MOTION.blurMax.midground

  return (
    <div
      className="
        relative flex h-screen w-full overflow-hidden font-sans text-tech-main
        selection:bg-tech-main/20 selection:text-tech-main-dark
      ">
      <HideFooter />
      
      <BackgroundLayer
        bgTransform={bgTransform}
        smoothMouseX={smoothMouseX}
        smoothMouseY={smoothMouseY}
        blurMax={bgBlurMax}
      />

      <MidgroundLayer
        mgTransform={mgTransform}
        smoothMouseX={smoothMouseX}
        smoothMouseY={smoothMouseY}
        blurMax={mgBlurMax}
      />

      <ForegroundLayer
        cardRef={cardRef}
        cardWidth={cardWidth}
        fgTransform={fgTransform}
        isAccessingDatabase={isAccessingDatabase}
        setIsAccessingDatabase={setIsAccessingDatabase}
      />
    </div>
  )
}
