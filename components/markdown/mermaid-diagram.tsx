"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { getMermaidConfig } from "@/lib/markdown/mermaid-config"
import { useTheme } from "@/lib/theme"

interface MermaidDiagramProps {
  children?: ReactNode
}

type RenderState = "loading" | "ready" | "error"

export function MermaidDiagram({ children }: MermaidDiagramProps) {
  const t = useTranslations("CommonA11y")
  const { resolvedTheme } = useTheme()
  const reactId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<RenderState>("loading")
  const source = String(children ?? "").trim()
  const diagramId = `mermaid-${reactId.replaceAll(/[^a-zA-Z0-9_-]/g, "")}`

  useEffect(() => {
    let cancelled = false

    async function renderDiagram() {
      const container = containerRef.current
      if (!container || !source) {
        setState("error")
        return
      }

      setState("loading")
      container.replaceChildren()

      try {
        const { default: mermaid } = await import("mermaid")
        mermaid.initialize(getMermaidConfig(resolvedTheme))
        const { svg, bindFunctions } = await mermaid.render(diagramId, source)

        if (cancelled || !containerRef.current) return

        containerRef.current.innerHTML = svg
        bindFunctions?.(containerRef.current)
        setState("ready")
      } catch {
        if (!cancelled) setState("error")
      }
    }

    void renderDiagram()

    return () => {
      cancelled = true
    }
  }, [diagramId, resolvedTheme, source])

  return (
    <figure
      aria-label={t("mermaidDiagram")}
      className="guide-line bg-surface-overlay/70 border-tech-main/35 my-6 overflow-hidden border p-3 sm:p-5">
      <div
        ref={containerRef}
        aria-hidden={state !== "ready"}
        className="custom-bottom-scrollbar overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-none"
      />
      {state === "loading" ? (
        <output className="text-tech-main/60 m-0 font-mono text-xs tracking-widest uppercase">
          {t("loadingMermaidDiagram")}
        </output>
      ) : null}
      {state === "error" ? (
        <div role="alert" className="text-tech-main-dark space-y-3">
          <p className="m-0 text-sm">{t("mermaidRenderError")}</p>
          <pre className="border-tech-main/20 bg-tech-main/5 overflow-x-auto border p-3 text-xs">
            <code>{source}</code>
          </pre>
        </div>
      ) : null}
    </figure>
  )
}
