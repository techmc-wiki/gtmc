"use client"

import { useEffect, useSyncExternalStore } from "react"
import type { MotionValue } from "motion/react"
import {
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "motion/react"
import { HOMEPAGE_MOTION } from "./homepage-constants"

const MOBILE_QUERY = "(max-width: 767px)"

function subscribeMobileQuery(onStoreChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY)
  query.addEventListener("change", onStoreChange)
  return () => query.removeEventListener("change", onStoreChange)
}

function getMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches
}

function getServerMobileSnapshot() {
  return false
}

export interface LayerTransform {
  x: MotionValue<number>
  y: MotionValue<number>
}

export interface ForegroundTransform extends LayerTransform {
  rotateX: MotionValue<number>
  rotateY: MotionValue<number>
}

export interface HomepageMotionValues {
  pointerX: MotionValue<number>
  pointerY: MotionValue<number>
  smoothMouseX: MotionValue<number>
  smoothMouseY: MotionValue<number>
  isReducedMotion: boolean
  isMobile: boolean
  foreground: ForegroundTransform
  midground: LayerTransform
  background: LayerTransform
}

export function useHomepageMotion(): HomepageMotionValues {
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const rawMouseX = useMotionValue(0)
  const rawMouseY = useMotionValue(0)
  const reducedMotionQuery = useReducedMotion()
  const isMobile = useSyncExternalStore(
    subscribeMobileQuery,
    getMobileSnapshot,
    getServerMobileSnapshot
  )

  useEffect(() => {
    if (isMobile || reducedMotionQuery) return

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      pointerX.set((e.clientX - centerX) / centerX)
      pointerY.set((e.clientY - centerY) / centerY)
      rawMouseX.set(e.clientX)
      rawMouseY.set(e.clientY)
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [isMobile, reducedMotionQuery, pointerX, pointerY, rawMouseX, rawMouseY])

  const smoothX = useSpring(pointerX, { damping: 20, stiffness: 300 })
  const smoothY = useSpring(pointerY, { damping: 20, stiffness: 300 })
  const smoothMouseX = useSpring(rawMouseX, {
    damping: 20,
    stiffness: 300,
  })
  const smoothMouseY = useSpring(rawMouseY, {
    damping: 20,
    stiffness: 300,
  })

  const config = reducedMotionQuery
    ? HOMEPAGE_MOTION.reducedMotion
    : isMobile
      ? HOMEPAGE_MOTION.mobile
      : HOMEPAGE_MOTION.desktop

  const foreground: ForegroundTransform = {
    x: useTransform(
      smoothX,
      (v) =>
        v * config.pointerAmplitude * HOMEPAGE_MOTION.layers.foreground * 25
    ),
    y: useTransform(
      smoothY,
      (v) =>
        v * config.pointerAmplitude * HOMEPAGE_MOTION.layers.foreground * 25
    ),
    rotateX: useTransform(smoothY, (v) => v * -3.5),
    rotateY: useTransform(smoothX, (v) => v * 3.5),
  }

  const midground: LayerTransform = {
    x: useTransform(
      smoothX,
      (v) => v * config.pointerAmplitude * HOMEPAGE_MOTION.layers.midground * 25
    ),
    y: useTransform(
      smoothY,
      (v) => v * config.pointerAmplitude * HOMEPAGE_MOTION.layers.midground * 25
    ),
  }

  const background: LayerTransform = {
    x: useTransform(
      smoothX,
      (v) =>
        v * config.pointerAmplitude * HOMEPAGE_MOTION.layers.background * 25
    ),
    y: useTransform(
      smoothY,
      (v) =>
        v * config.pointerAmplitude * HOMEPAGE_MOTION.layers.background * 25
    ),
  }

  return {
    pointerX,
    pointerY,
    smoothMouseX,
    smoothMouseY,
    isReducedMotion: reducedMotionQuery ?? false,
    isMobile,
    foreground,
    midground,
    background,
  }
}
