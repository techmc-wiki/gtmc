"use client"

import Clarity from "@microsoft/clarity"
import { useEffect } from "react"

const CLARITY_PROJECT_ID = "y8og6nwaf4"

export function ClarityAnalytics() {
  useEffect(() => {
    Clarity.init(CLARITY_PROJECT_ID)
  }, [])

  return null
}
