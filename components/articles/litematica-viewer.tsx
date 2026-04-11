"use client"

import { useEffect, useRef, useState, type MouseEvent } from "react"
import { CornerBrackets } from "@/components/ui/corner-brackets"

// Interfaces for schematic-renderer library
interface SchematicManager {
  getFirstSchematic?: () => { id: string }
  getSchematic?: (id: string) => unknown
  getMaxSchematicDimensions?: () => { x: number; y: number; z: number }
  loadSchematic?: (name: string, buffer: ArrayBuffer) => Promise<void>
}

interface UIManager {
  showFPVOverlay?: () => void
  fpvOverlay?: HTMLElement
}

interface CanvasWithPatch extends HTMLCanvasElement {
  __gtmcPointerCapturePatched?: boolean
}

interface FlyControls {
  setOverlayVisible?: () => void
  overlayElement?: HTMLElement
  __gtmcSafeLockPatched?: boolean
  lock?: () => void
  enabled?: boolean
  isLocked?: boolean
  getPointerLockControls?: () => { domElement?: HTMLElement }
}

interface CameraManager {
  flyControls?: FlyControls
  isFlyControlsLocked?: () => boolean
  isFlyControlsEnabled?: () => boolean
  disableFlyControls?: () => void
  enableFlyControls?: () => void
  stopAnimation?: () => void
  stopAutoOrbit?: () => void
  setAutoOrbitAfterZoom?: (value: boolean) => void
  setZoomInOnLoad?: (value: boolean) => void
  setFlyControlsSettings?: (settings: unknown) => void
  focusOnSchematic?: (opts: { animationDuration: number; skipPathFitting: boolean }) => Promise<void>
}

interface LitematicaRenderer {
  getLoadedSchematics?: () => string[]
  schematicManager?: SchematicManager
  uiManager?: UIManager
  cameraManager?: CameraManager
  dispose?: () => void
  enabled?: boolean
  isLocked?: boolean
  flyControls?: FlyControls
  isFlyControlsLocked?: () => boolean
  resetRenderingBounds?: (schematicId: string, all: boolean) => void
  setRenderingBounds?: (
    schematicId: string,
    min: [number, number, number],
    max: [number, number, number],
    all: boolean
  ) => void
  renderManager?: { render?: () => void }
  targetFPS?: number
  idleFPS?: number
  enableAdaptiveFPS?: boolean
}

export interface LitematicaViewerProps {
  url: string
  height?: string | number
}

export default function LitematicaViewer({
  url,
  height = 400,
}: LitematicaViewerProps) {
  const ACTIVE_TARGET_FPS = 60
  const IDLE_TARGET_FPS = 24
  const canvasRef = useRef<CanvasWithPatch | null>(null)
  const rendererRef = useRef<LitematicaRenderer | null>(null)
  const schematicIdRef = useRef<string | null>(null)
  const loadTokenRef = useRef(0)
  const lastPointerUnlockAtRef = useRef(Number.NEGATIVE_INFINITY)

  const [maxLayer, setMaxLayer] = useState(0)
  const [sliderLayer, setSliderLayer] = useState(0)
  const [targetLayer, setTargetLayer] = useState<number | "all">("all")
  const [layerMode, setLayerMode] = useState<"single" | "below">("below")
  const [schematicReady, setSchematicReady] = useState(false)
  const [isFlyMode, setIsFlyMode] = useState(false)
  const [isFlyEnabled, setIsFlyEnabled] = useState(false)

  const POINTER_LOCK_COOLDOWN_MS = 350

  const resolveLoadedSchematicId = (renderer: LitematicaRenderer) => {
    const loadedSchematics = renderer?.getLoadedSchematics?.()

    if (Array.isArray(loadedSchematics) && loadedSchematics.length > 0) {
      if (
        schematicIdRef.current &&
        loadedSchematics.includes(schematicIdRef.current)
      ) {
        return schematicIdRef.current
      }

      return loadedSchematics[0]
    }

    return renderer?.schematicManager?.getFirstSchematic?.()?.id ?? null
  }

  const normalizeUrlInput = (input: string) => {
    let value = input
      .replace(/\r?\n/g, "")
      .trim()
      .replace(/^['"]|['"]$/g, "")

    // Some markdown pipelines may hand us pre-encoded strings.
    for (let i = 0; i < 2; i++) {
      try {
        const decoded = decodeURIComponent(value)
        if (decoded === value) break
        value = decoded
      } catch {
        break
      }
    }

    return value
  }

  const suppressNativeFpOverlays = (instance: LitematicaRenderer) => {
    const ui = instance?.uiManager
    const cm = instance?.cameraManager

    try {
      if (ui) {
        ui.showFPVOverlay = () => {}
        if (ui.fpvOverlay) {
          ui.fpvOverlay.style.setProperty("display", "none", "important")
          ui.fpvOverlay.style.setProperty("pointer-events", "none", "important")
          ui.fpvOverlay.style.setProperty("opacity", "0", "important")
        }
      }

      if (cm?.flyControls) {
        cm.flyControls.setOverlayVisible = () => {}
        if (cm.flyControls.overlayElement) {
          cm.flyControls.overlayElement.style.setProperty(
            "display",
            "none",
            "important"
          )
          cm.flyControls.overlayElement.style.setProperty(
            "pointer-events",
            "none",
            "important"
          )
          cm.flyControls.overlayElement.style.setProperty("opacity", "0", "important")
        }
      }
    } catch {
      // Keep rendering resilient even if internals change.
    }
  }

  const patchFlyLockWithCooldown = (cameraManager: CameraManager) => {
    const flyControls = cameraManager?.flyControls
    if (!flyControls) return
    if (flyControls.__gtmcSafeLockPatched) return

    const originalLock =
      typeof flyControls.lock === "function" ? flyControls.lock.bind(flyControls) : null
    if (!originalLock) return

    const pointerLockControls = flyControls.getPointerLockControls?.()
    const pointerLockElement = pointerLockControls?.domElement || canvasRef.current

    flyControls.lock = () => {
      if (!flyControls.enabled || flyControls.isLocked) return

      if (document.pointerLockElement === canvasRef.current) return

      const elapsedSinceUnlock = performance.now() - lastPointerUnlockAtRef.current
      if (elapsedSinceUnlock < POINTER_LOCK_COOLDOWN_MS) {
        return
      }

      try {
        if (
          pointerLockElement &&
          typeof pointerLockElement.requestPointerLock === "function"
        ) {
          const lockResult = pointerLockElement.requestPointerLock()

          if (lockResult && typeof lockResult.catch === "function") {
            lockResult.catch(() => {
              // Swallow rejected pointer lock promises; state is handled by events.
            })
          }

          return
        }

        originalLock()
      } catch {
        // Ignore lock failures; pointerlockerror handler updates UI state.
      }
    }

    flyControls.__gtmcSafeLockPatched = true
  }

  const patchCanvasPointerCapture = (canvas: CanvasWithPatch) => {
    if (canvas.__gtmcPointerCapturePatched) return

    const canvasAny = canvas as unknown as CanvasWithPatch & Record<string, unknown>
    const originalSetPointerCapture =
      typeof canvas.setPointerCapture === "function"
        ? canvas.setPointerCapture.bind(canvas)
        : null
    const originalReleasePointerCapture =
      typeof canvas.releasePointerCapture === "function"
        ? canvas.releasePointerCapture.bind(canvas)
        : null

    if (originalSetPointerCapture) {
      canvasAny.setPointerCapture = (pointerId: number) => {
        try {
          originalSetPointerCapture(pointerId)
        } catch {
          // Ignore invalid pointer capture states from transient pointer lifecycle races.
        }
      }
    }

    if (originalReleasePointerCapture) {
      canvasAny.releasePointerCapture = (pointerId: number) => {
        try {
          originalReleasePointerCapture(pointerId)
        } catch {
          // Ignore invalid pointer release states for symmetry with setPointerCapture.
        }
      }
    }

    canvasAny.__gtmcOriginalSetPointerCapture = originalSetPointerCapture
    canvasAny.__gtmcOriginalReleasePointerCapture = originalReleasePointerCapture
    canvasAny.__gtmcPointerCapturePatched = true
  }

  const restoreCanvasPointerCapture = (canvas: CanvasWithPatch | null) => {
    if (!canvas) return
    if (!canvas.__gtmcPointerCapturePatched) return

    const canvasAny = canvas as unknown as CanvasWithPatch & Record<string, unknown>
    if ((canvas as CanvasWithPatch & { __gtmcOriginalSetPointerCapture?: unknown })
      .__gtmcOriginalSetPointerCapture) {
      canvas.setPointerCapture = (canvas as CanvasWithPatch & { __gtmcOriginalSetPointerCapture?: typeof canvas.setPointerCapture })
        .__gtmcOriginalSetPointerCapture!
    }
    if (canvasAny.__gtmcOriginalReleasePointerCapture) {
      canvas.releasePointerCapture = canvasAny.__gtmcOriginalReleasePointerCapture as typeof canvas.releasePointerCapture
    }

    delete canvasAny.__gtmcOriginalSetPointerCapture
    delete canvasAny.__gtmcOriginalReleasePointerCapture
    delete canvasAny.__gtmcPointerCapturePatched
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    patchCanvasPointerCapture(canvas)

    const loadToken = ++loadTokenRef.current
    let isActive = true
    const schematicRequestController = new AbortController()

    setSchematicReady(false)
    schematicIdRef.current = null
    setTargetLayer("all")
    setIsFlyMode(false)
    setIsFlyEnabled(false)

    const isCurrentLoad = () => isActive && loadToken === loadTokenRef.current

    const cleanUrl = normalizeUrlInput(url)
    let renderer: LitematicaRenderer | null = null

    const proxyUrl = `/api/litematica-download?${new URLSearchParams({
      url: cleanUrl,
      ts: String(Date.now()),
    }).toString()}`

    const initRenderer = async () => {
      try {
        const mod = await import("schematic-renderer") as unknown as {
          SchematicRenderer?: new (canvas: HTMLCanvasElement, opts: unknown, fetchFn: unknown, config: unknown) => LitematicaRenderer
          default?: { SchematicRenderer?: new (canvas: HTMLCanvasElement, opts: unknown, fetchFn: unknown, config: unknown) => LitematicaRenderer }
        }
        const SR =
          typeof mod.SchematicRenderer === "function"
            ? mod.SchematicRenderer
            : typeof mod.default === "function"
              ? mod.default
              : mod.default?.SchematicRenderer

        if (!SR) {
          throw new Error("SchematicRenderer constructor not found in module exports")
        }

        renderer = new SR(
          canvas,
          {},
          {
            default: async () => {
              const res = await fetch("/pack.zip")
              return await res.blob()
            },
          },
          {
            showGrid: true,
            backgroundColor: 0xf8f9fc,
            enableInteraction: false,
            enableDragAndDrop: false,
            enableGizmos: false,
            meshBuildingMode: "incremental",
            targetFPS: 120,
            idleFPS: 120,
            enableAdaptiveFPS: false,
            postProcessingOptions: {
              enabled: true,
              enableSSAO: false,
              enableSMAA: true,
              enableGamma: true,
            },
            ffmpeg: { terminate: () => {} },
            cameraOptions: {
              position: [10, 10, 10],
              autoOrbitAfterZoom: false,
              enableZoomInOnLoad: false,
            },
            callbacks: {
              onRendererInitialized: async (r: LitematicaRenderer) => {
                if (!isCurrentLoad()) {
                  r.dispose?.()
                  return
                }

                try {
                  suppressNativeFpOverlays(r)

                  const res = await fetch(proxyUrl, {
                    cache: "no-store",
                    signal: schematicRequestController.signal,
                  })
                  if (!res.ok) {
                    throw new Error("Failed to fetch proxy: " + res.status)
                  }
                  let arrayBuffer = await res.arrayBuffer()

                  const fileName = cleanUrl.split("/").pop() || "schem.litematic"
                  await r.schematicManager?.loadSchematic?.(fileName, arrayBuffer)
                  arrayBuffer = new ArrayBuffer(0)

                  if (!isCurrentLoad()) {
                    r.dispose?.()
                    return
                  }

                  const resolvedSchematicId = resolveLoadedSchematicId(r)
                  if (!resolvedSchematicId) {
                    throw new Error("No loaded schematic ID found after loadSchematic")
                  }
                  schematicIdRef.current = resolvedSchematicId

                  const dim = r.schematicManager?.getMaxSchematicDimensions?.()
                  if (dim) {
                    const topLayer = Math.max(0, Math.ceil(dim.y) - 1)
                    setMaxLayer(topLayer)
                    setSliderLayer(topLayer)
                  }

                  // Avoid camera animation/auto orbit fighting with first-person controls.
                  await r.cameraManager?.focusOnSchematic?.({
                    animationDuration: 0,
                    skipPathFitting: true,
                  })
                  r.cameraManager?.stopAnimation?.()
                  r.cameraManager?.stopAutoOrbit?.()
                  r.cameraManager?.setAutoOrbitAfterZoom?.(false)

                  suppressNativeFpOverlays(r)
                  if (!isCurrentLoad()) return

                  r.targetFPS = ACTIVE_TARGET_FPS
                  r.idleFPS = IDLE_TARGET_FPS
                  r.enableAdaptiveFPS = true

                  setSchematicReady(true)
                } catch (err) {
                  if (err instanceof Error && err.name === "AbortError") {
                    return
                  }

                  console.error("Error loading schematic:", err)
                }
              },
              onSchematicFileLoadFailure: (err: Error) => {
                console.error("Failed to load schematic file:", err)
              },
            },
          }
        )

        if (!isCurrentLoad()) {
          renderer?.dispose?.()
          return
        }

        rendererRef.current = renderer
      } catch (e) {
        console.error("Error setting up schematic-renderer:", e)
      }
    }

    const handlePointerLockChange = () => {
      const current = rendererRef.current
      if (!current) return

      suppressNativeFpOverlays(current)

      const cm = current.cameraManager
      const locked = cm?.isFlyControlsLocked?.() ?? document.pointerLockElement === canvas
      const flyEnabled = Boolean(cm?.isFlyControlsEnabled?.())

      if (!locked) {
        lastPointerUnlockAtRef.current = performance.now()
      }

      setIsFlyEnabled(flyEnabled)
      setIsFlyMode(Boolean(locked && flyEnabled))
    }

    const handlePointerLockError = (event: Event) => {
      const current = rendererRef.current
      const cm = current?.cameraManager
      if (!cm?.isFlyControlsEnabled?.()) {
        return
      }

      lastPointerUnlockAtRef.current = performance.now()

      cm.disableFlyControls?.()
      setIsFlyMode(false)
      setIsFlyEnabled(false)

      // Prevent PointerLockControls' internal error listener from logging noisy errors.
      event.stopImmediatePropagation()
    }

    const handleEscapeKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Escape") return

      const current = rendererRef.current
      const cm = current?.cameraManager
      if (cm?.isFlyControlsEnabled?.()) {
        // ESC acts as explicit exit from first-person mode.
        lastPointerUnlockAtRef.current = performance.now()
        cm.disableFlyControls?.()
        setIsFlyMode(false)
        setIsFlyEnabled(false)
      }
    }

    document.addEventListener("pointerlockchange", handlePointerLockChange)
    document.addEventListener("pointerlockerror", handlePointerLockError, true)
    document.addEventListener("keydown", handleEscapeKeyDown, true)
    initRenderer()

    return () => {
      isActive = false
      schematicRequestController.abort()
      document.removeEventListener("pointerlockchange", handlePointerLockChange)
      document.removeEventListener("pointerlockerror", handlePointerLockError, true)
      document.removeEventListener("keydown", handleEscapeKeyDown, true)
      setSchematicReady(false)
      schematicIdRef.current = null
      setIsFlyMode(false)
      setIsFlyEnabled(false)

      if (
        rendererRef.current?.cameraManager?.isFlyControlsEnabled?.() &&
        typeof rendererRef.current.cameraManager.disableFlyControls === "function"
      ) {
        rendererRef.current.cameraManager.disableFlyControls()
      }

      if (rendererRef.current && typeof rendererRef.current.dispose === "function") {
        rendererRef.current.dispose()
      }

      restoreCanvasPointerCapture(canvas)

      rendererRef.current = null
    }
  }, [url])

  useEffect(() => {
    if (!schematicReady || !rendererRef.current) {
      return
    }

    const renderer = rendererRef.current
    if (!renderer) return

    const sm = renderer.schematicManager
    if (!sm) return

    const schematicId = resolveLoadedSchematicId(renderer)
    if (!schematicId) return

    schematicIdRef.current = schematicId
    if (!sm.getSchematic?.(schematicId)) return

    const dim = sm.getMaxSchematicDimensions?.()
    if (!dim) return

    const maxX = Math.max(1, Math.ceil(dim.x))
    const maxY = Math.max(1, Math.ceil(dim.y))
    const maxZ = Math.max(1, Math.ceil(dim.z))

    try {
      if (targetLayer === "all") {
        renderer?.resetRenderingBounds?.(schematicId, true)
      } else {
        const y = Math.max(0, Math.min(targetLayer, maxY - 1))

        if (layerMode === "single") {
          renderer?.setRenderingBounds?.(
            schematicId,
            [0, y, 0],
            [maxX, y + 1, maxZ],
            false
          )
        } else {
          renderer?.setRenderingBounds?.(
            schematicId,
            [0, 0, 0],
            [maxX, y + 1, maxZ],
            false
          )
        }
      }

      renderer?.renderManager?.render?.()
    } catch (error) {
      console.error("Failed to update rendering bounds:", error)
    }
  }, [schematicReady, targetLayer, layerMode])

  const commitLayerSelection = () => {
    if (!schematicReady) return
    setTargetLayer(sliderLayer)
  }

  const toggleFlyMode = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()

    const current = rendererRef.current
    if (!current?.cameraManager) return

    const cm = current.cameraManager
    suppressNativeFpOverlays(current)

    cm.stopAnimation?.()
    cm.stopAutoOrbit?.()
    cm.setAutoOrbitAfterZoom?.(false)
    cm.setZoomInOnLoad?.(false)

    const flyEnabled = Boolean(cm.isFlyControlsEnabled?.())

    if (flyEnabled) {
      lastPointerUnlockAtRef.current = performance.now()
      cm.disableFlyControls?.()
      setIsFlyMode(false)
      setIsFlyEnabled(false)
      return
    }

    cm.enableFlyControls?.()
    cm.setFlyControlsSettings?.({
      moveSpeed: 16,
      sprintMultiplier: 2.4,
      keybinds: {
        up: "Space",
        down: "KeyC",
        sprint: "ShiftLeft",
      },
    })

    patchFlyLockWithCooldown(cm)
    // If already enabled but unlocked, this acts as a reliable re-lock action.
    cm.flyControls?.lock?.()

    setIsFlyEnabled(true)
    setIsFlyMode(Boolean(cm.isFlyControlsLocked?.()))
  }

  return (
    <div
      className="
      group relative my-8 w-full rounded-sm border-2 guide-line bg-tech-bg
      font-mono
    "
    >
      <CornerBrackets size="size-4" color="border-tech-main/40" />

      <canvas
        ref={canvasRef}
        className="block w-full outline-none"
        style={{
          cursor: isFlyMode ? "crosshair" : "pointer",
          height: typeof height === "number" ? height + "px" : height,
        }}
      />

      <button
        type="button"
        onClick={toggleFlyMode}
        className={`absolute top-4 right-4 z-20 border px-3 py-1 text-[11px] font-bold tracking-widest uppercase transition-colors ${
          isFlyEnabled
            ? "border-tech-main bg-tech-main text-white"
            : "border-tech-main/60 bg-white/90 text-tech-main hover:bg-tech-main hover:text-white"
        }`}
      >
        {isFlyEnabled ? "SYS.EXIT_FLY" : "SYS.FIRST_PERSON"}
      </button>

      <div
        className="
        pointer-events-none absolute top-4 left-4 flex items-center gap-3
      "
      >
        <span
          className="
          shrink-0 border border-tech-main/40 bg-white/70 px-2 py-0.5 text-xs
          font-bold tracking-wider text-tech-main shadow-sm backdrop-blur-sm
        "
        >
          [LITEMATICA]
        </span>
        <span
          className="
          hidden text-[10px] tracking-widest text-tech-main/80 uppercase
          md:inline-block
        "
        >
          INTERACTIVE BLUEPRINT
        </span>
      </div>

      {maxLayer > 0 && (
        <div
          className={`absolute right-4 bottom-16 z-10 w-[250px] border border-tech-main/60 bg-white/90 p-3 text-tech-main shadow-sm backdrop-blur-md transition-all ${
            isFlyEnabled ? "pointer-events-none translate-x-2 opacity-0" : "opacity-100"
          }`}
        >
          <div className="mb-2 flex items-center justify-between border-b guide-line pb-1">
            <span className="text-[10px] font-bold tracking-widest uppercase">
              SYS.LAYER_FILTER
            </span>

            <button
              type="button"
              onClick={() => {
                setTargetLayer("all")
                setSliderLayer(maxLayer)
              }}
              className="border border-tech-main/30 px-1.5 py-0.5 text-[10px] font-bold uppercase transition-colors hover:bg-tech-main hover:text-white"
            >
              RESET
            </button>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs font-bold">
            <span>LAYER {targetLayer === "all" ? "ALL" : targetLayer}</span>
            {targetLayer !== "all" && targetLayer !== sliderLayer && (
              <span className="text-[10px] opacity-70">PENDING {sliderLayer}</span>
            )}
          </div>

          <div className="mb-3 flex border border-tech-main/40 text-[10px] font-bold uppercase">
            <button
              type="button"
              onClick={() => setLayerMode("single")}
              className={`flex-1 py-1 transition-colors ${
                layerMode === "single"
                  ? "bg-tech-main text-white"
                  : "bg-white text-tech-main hover:bg-tech-main/10"
              }`}
            >
              SINGLE
            </button>

            <button
              type="button"
              onClick={() => setLayerMode("below")}
              className={`flex-1 border-l border-tech-main/40 py-1 transition-colors ${
                layerMode === "below"
                  ? "bg-tech-main text-white"
                  : "bg-white text-tech-main hover:bg-tech-main/10"
              }`}
            >
              BELOW
            </button>
          </div>

          <input
            type="range"
            min={0}
            max={maxLayer}
            value={sliderLayer}
            onChange={(e) => setSliderLayer(Number(e.target.value))}
            onPointerUp={commitLayerSelection}
            onMouseUp={commitLayerSelection}
            onTouchEnd={commitLayerSelection}
            onKeyUp={commitLayerSelection}
            data-litematica-layer-slider className="w-full cursor-ew-resize"
          />

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={commitLayerSelection}
              className="border border-tech-main px-2 py-0.5 text-[10px] font-bold uppercase transition-colors hover:bg-tech-main hover:text-white"
            >
              APPLY
            </button>
          </div>

          <style
            dangerouslySetInnerHTML={{
              __html: `
              .style-litematica-layer-slider {
                -webkit-appearance: none;
                appearance: none;
                height: 2px;
                background: rgba(71, 85, 105, 0.28);
                outline: none;
              }
              .style-litematica-layer-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 8px;
                height: 16px;
                background: var(--color-tech-main);
                cursor: ew-resize;
                border-radius: 0;
              }
              .style-litematica-layer-slider::-moz-range-thumb {
                width: 8px;
                height: 16px;
                background: var(--color-tech-main);
                cursor: ew-resize;
                border-radius: 0;
                border: none;
              }
            `,
            }}
          />
        </div>
      )}

      <div
        className="
        pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2
        opacity-80 transition-opacity duration-300
        group-hover:opacity-100
      "
      >
        <div
          className="
          flex items-center gap-4 rounded-sm border guide-line bg-white/80 px-3
          py-1.5 text-xs whitespace-nowrap text-tech-main/80 shadow-sm
          backdrop-blur-md
        "
        >
          {isFlyEnabled ? (
            <>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-[2px] border border-tech-main/30 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-tech-main shadow-sm">
                  WASD
                </kbd>{" "}
                Move
              </span>
              <span className="flex items-center gap-1.5 opacity-60">|</span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-[2px] border border-tech-main/30 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-tech-main shadow-sm">
                  SPACE
                </kbd>{" "}
                Up
              </span>
              <span className="flex items-center gap-1.5 opacity-60">|</span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-[2px] border border-tech-main/30 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-tech-main shadow-sm">
                  C
                </kbd>{" "}
                Down
              </span>
              <span className="flex items-center gap-1.5 opacity-60">|</span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-[2px] border border-tech-main/30 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-tech-main shadow-sm">
                  ESC
                </kbd>{" "}
                Unlock
              </span>
              {!isFlyMode && (
                <>
                  <span className="flex items-center gap-1.5 opacity-60">|</span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="rounded-[2px] border border-tech-main/30 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-tech-main shadow-sm">
                      Click
                    </kbd>{" "}
                    Lock
                  </span>
                </>
              )}
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-[2px] border border-tech-main/30 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-tech-main shadow-sm">
                  Left
                </kbd>{" "}
                Rotate
              </span>
              <span className="flex items-center gap-1.5 opacity-60">|</span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-[2px] border border-tech-main/30 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-tech-main shadow-sm">
                  Right
                </kbd>{" "}
                Pan
              </span>
              <span className="flex items-center gap-1.5 opacity-60">|</span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-[2px] border border-tech-main/30 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-tech-main shadow-sm">
                  Wheel
                </kbd>{" "}
                Zoom
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
