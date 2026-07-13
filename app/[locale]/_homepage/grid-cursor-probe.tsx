"use client"

import { useEffect, useRef } from "react"

const GRID_SIZE = 40
const POINTER_QUERY =
  "(min-width: 64rem) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"

function formatCoordinate(value: number): string {
  const sign = value >= 0 ? "+" : "-"
  return `${sign}${String(Math.abs(value)).padStart(3, "0")}`
}

export function GridCursorProbe() {
  const fieldRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const field = fieldRef.current
    const probe = probeRef.current
    const label = labelRef.current
    const section = field?.parentElement

    if (!field || !probe || !label || !section) return

    const pointerQuery = window.matchMedia(POINTER_QUERY)
    let frame: number | null = null
    let pointerX = 0
    let pointerY = 0
    let pointerInside = false
    let lastX: number | null = null
    let lastY: number | null = null
    let isListening = false

    const renderProbe = () => {
      frame = null
      if (!pointerInside || !pointerQuery.matches) return

      const x = Math.round(pointerX / GRID_SIZE) * GRID_SIZE
      const y = Math.round(pointerY / GRID_SIZE) * GRID_SIZE
      if (x === lastX && y === lastY) return

      const gridX = Math.round((x - window.innerWidth / 2) / GRID_SIZE)
      const gridZ = Math.round(y / GRID_SIZE)

      lastX = x
      lastY = y
      probe.style.transform = `translate3d(${x}px, ${y}px, 0)`
      probe.dataset.visible = "true"
      label.dataset.side = x > window.innerWidth - 180 ? "left" : "right"
      label.textContent = `X ${formatCoordinate(gridX)} / Z ${formatCoordinate(gridZ)}`
    }

    const handlePointerEnter = () => {
      pointerInside = true
      lastX = null
      lastY = null
    }

    const handlePointerMove = (event: PointerEvent) => {
      pointerInside = true
      pointerX = event.clientX
      pointerY = event.clientY

      if (frame === null) {
        frame = requestAnimationFrame(renderProbe)
      }
    }

    const hideProbe = () => {
      pointerInside = false
      if (frame !== null) {
        cancelAnimationFrame(frame)
        frame = null
      }
      probe.dataset.visible = "false"
    }

    const enableProbe = () => {
      if (isListening) return
      isListening = true
      section.addEventListener("pointerenter", handlePointerEnter)
      section.addEventListener("pointermove", handlePointerMove)
      section.addEventListener("pointerleave", hideProbe)
    }

    const disableProbe = () => {
      if (isListening) {
        isListening = false
        section.removeEventListener("pointerenter", handlePointerEnter)
        section.removeEventListener("pointermove", handlePointerMove)
        section.removeEventListener("pointerleave", hideProbe)
      }
      hideProbe()
    }

    const syncProbe = () => {
      if (pointerQuery.matches) {
        enableProbe()
      } else {
        disableProbe()
      }
    }

    pointerQuery.addEventListener("change", syncProbe)
    syncProbe()

    return () => {
      pointerQuery.removeEventListener("change", syncProbe)
      disableProbe()
    }
  }, [])

  return (
    <div
      ref={fieldRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-20 hidden overflow-hidden motion-safe:lg:block">
      <div
        ref={probeRef}
        data-visible="false"
        className="absolute top-0 left-0 opacity-0 transition-opacity duration-150 will-change-transform data-[visible=true]:opacity-55 motion-reduce:transition-none dark:data-[visible=true]:opacity-40">
        <div className="relative size-8 -translate-x-1/2 -translate-y-1/2">
          <span className="bg-tech-signal absolute top-1/2 left-0 h-px w-full" />
          <span className="bg-tech-signal absolute top-0 left-1/2 h-full w-px" />
          <span className="border-tech-signal bg-tech-bg absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 border" />
          <span
            ref={labelRef}
            data-side="right"
            className="border-tech-signal/50 bg-surface/80 text-tech-main-dark absolute top-0 left-10 border-l px-2 py-1 font-mono text-[0.5rem] tracking-[0.14em] whitespace-nowrap backdrop-blur-sm data-[side=left]:right-10 data-[side=left]:left-auto data-[side=left]:border-r data-[side=left]:border-l-0"
          />
        </div>
      </div>
    </div>
  )
}
