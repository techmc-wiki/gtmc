"use client"

import React, { useRef, useEffect, useCallback } from "react"
import { motion, useTransform, MotionValue } from "motion/react"
import { HOMEPAGE_MOTION } from "@/lib/motion/homepage-constants"

export function DecorElement({
  children,
  className,
  smoothMouseX,
  smoothMouseY,
  blurMax,
  isReducedMotion = false,
}: {
  children: React.ReactNode
  className?: string
  smoothMouseX: MotionValue<number>
  smoothMouseY: MotionValue<number>
  blurMax: number
  isReducedMotion?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const centerRef = useRef({ cx: 0, cy: 0 })
  const isActiveRef = useRef(true)

  const updateCenter = useCallback(() => {
    if (!ref.current || !isActiveRef.current) return
    const rect = ref.current.getBoundingClientRect()
    centerRef.current = {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(updateCenter, 100)

    let resizeTimeout: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(updateCenter, 100)
    }

    window.addEventListener("resize", handleResize)

    return () => {
      clearTimeout(timer)
      clearTimeout(resizeTimeout)
      window.removeEventListener("resize", handleResize)
      isActiveRef.current = false
    }
  }, [updateCenter])

  const filter = useTransform(
    [smoothMouseX, smoothMouseY],
    ([mx, my]: number[]) => {
      if (isReducedMotion || blurMax <= 0) {
        return "blur(0px)"
      }

      const { cx, cy } = centerRef.current
      if (cx === 0 && cy === 0) {
        return "blur(0px)"
      }

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
