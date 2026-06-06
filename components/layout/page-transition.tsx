"use client"

import * as React from "react"
import { motion } from "motion/react"
import { usePathname } from "next/navigation"

const transitionConfig = { duration: 0.3, ease: "easeInOut" as const }
const initialConfig = { opacity: 0, x: -20 }
const animateConfig = { opacity: 1, x: 0 }

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <motion.div
      key={pathname}
      initial={initialConfig}
      animate={animateConfig}
      transition={transitionConfig}
      className="w-full">
      {children}
    </motion.div>
  )
}
