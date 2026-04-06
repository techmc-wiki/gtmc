"use client"

import { useRef, useCallback } from "react"
import { motion, useTransform, MotionValue } from "motion/react"
import { HOMEPAGE_MOTION } from "@/lib/motion/homepage-constants"

export function DecorElement({
  children,
  className,
  smoothMouseX,
  smoothMouseY,
  blurMax,
}: {
  children: React.ReactNode
  className?: string
  smoothMouseX: MotionValue<number>
  smoothMouseY: MotionValue<number>
  blurMax: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  const getCenter = useCallback(() => {
    if (!ref.current) return { cx: 0, cy: 0 }
    const rect = ref.current.getBoundingClientRect()
    return {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    }
  }, [])

  const filter = useTransform(
    [smoothMouseX, smoothMouseY],
    ([mx, my]: number[]) => {
      const { cx, cy } = getCenter()
      const dx = mx - cx
      const dy = my - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const t = Math.min(1, dist / HOMEPAGE_MOTION.blurRadius)
      return `blur(${t * blurMax}px)`
    }
  )

  return (
    <motion.div ref={ref} className={className} style={{ filter }}>
      {children}
    </motion.div>
  )
}
