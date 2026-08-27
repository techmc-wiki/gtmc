"use client"

import { useEffect } from "react"
import Clarity from "@microsoft/clarity"

const CLARITY_PROJECT_ID = "y8og6nwaf4"

export function ClarityAnalytics() {
  useEffect(() => {
    Clarity.init(CLARITY_PROJECT_ID)
  }, [])

  return null
}
