import type { MermaidConfig } from "mermaid"
import type { ResolvedTheme } from "@/lib/theme"

const THEME_VARIABLES = {
  light: {
    background: "#f5f4ef",
    primaryColor: "#fcfbf8",
    primaryTextColor: "#20283c",
    primaryBorderColor: "#4a5468",
    lineColor: "#4a5468",
    secondaryColor: "#c9cfdd",
    tertiaryColor: "#f5f4ef",
    edgeLabelBackground: "#fcfbf8",
  },
  dark: {
    background: "#101826",
    primaryColor: "#1a2536",
    primaryTextColor: "#e7ecf4",
    primaryBorderColor: "#9aa7bd",
    lineColor: "#9aa7bd",
    secondaryColor: "#2a3852",
    tertiaryColor: "#162031",
    edgeLabelBackground: "#1a2536",
  },
} as const

export function getMermaidConfig(theme: ResolvedTheme): MermaidConfig {
  return {
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
    theme: "base",
    darkMode: theme === "dark",
    fontFamily:
      'var(--font-geist-sans), var(--font-noto-sans-sc, "PingFang SC"), sans-serif',
    themeVariables: THEME_VARIABLES[theme],
  }
}
