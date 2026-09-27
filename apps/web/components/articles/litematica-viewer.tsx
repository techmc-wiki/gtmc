"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import { useTranslations } from "next-intl"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js"
import { ScanEye, LogOut, RotateCcw, Layers, Square, Check } from "lucide-react"
import { IconButton } from "@/components/ui/icon-button"
import { Separator } from "@/components/ui/shadcn/separator"
import { Kbd } from "@/components/ui/shadcn/kbd"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { useTheme } from "@/lib/theme"
import { loadSchematicByFileName } from "@/lib/schematic/formats"
import { getSharedResourcePack } from "@/lib/schematic/pack"
import type * as Nucleation from "nucleation"

type NucleationModule = typeof Nucleation
type Schematic = InstanceType<NucleationModule["Schematic"]>
type ResourcePack = InstanceType<NucleationModule["ResourcePack"]>

const MOVE_SPEED = 16
const SPRINT_MULTIPLIER = 2.4
const POINTER_LOCK_COOLDOWN_MS = 350

interface Bounds {
  minX: number
  minY: number
  minZ: number
  maxX: number
  maxY: number
  maxZ: number
}

type LayerRange =
  | { mode: "all" }
  | { mode: "below"; y: number }
  | { mode: "single"; y: number }

type LoadError = "TOO_DETAILED" | "FAILED"

export interface LitematicaViewerProps {
  url: string
  height?: string | number
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function parseGlb(bytes: Uint8Array): Promise<THREE.Group> {
  const { promise, resolve, reject } = Promise.withResolvers<THREE.Group>()
  // GLTFLoader.parse wants a standalone ArrayBuffer; copy so the loader
  // never reads outside the byte range it owns.
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  new GLTFLoader().parse(
    buffer,
    "",
    (gltf) => resolve(gltf.scene),
    (err) => reject(err instanceof Error ? err : new Error(String(err)))
  )
  return promise
}

/**
 * Mesh a schematic, optionally bounded to a layer range. `all` meshes the
 * source directly; ranges copy a bounded region into a fresh schematic and
 * mesh that, so the source stays cached for later layer changes.
 *
 * Meshing is synchronous; mesher exhaustion (very complex schematics)
 * surfaces as a WASM trap, not a regular Error — callers must catch
 * everything and treat it as "too detailed". See the LitematicaQL findings.
 */
function meshSchematic(
  nuc: NucleationModule,
  source: Schematic,
  pack: ResourcePack,
  range: LayerRange,
  tight: { x: number; y: number; z: number }
): { glb: Uint8Array; bounds: Bounds; triangles: number } {
  let target = source
  if (range.mode !== "all") {
    target = nuc.Schematic.create("slice")
    const minY = range.mode === "single" ? range.y : 0
    const maxY = range.y
    target.copyRegion(source, 0, minY, 0, tight.x - 1, maxY, tight.z - 1, 0, 0, 0, "[]")
  }
  const result = nuc.MeshResult.create(target, pack, nuc.MeshConfig.create())
  const b = result.bounds()
  return {
    glb: b64ToBytes(result.glbDataB64()),
    bounds: { minX: b.minX, minY: b.minY, minZ: b.minZ, maxX: b.maxX, maxY: b.maxY, maxZ: b.maxZ },
    triangles: result.triangleCount(),
  }
}

function disposeGroup(group: THREE.Object3D) {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
      for (const material of materials) {
        material.map?.dispose()
        material.dispose()
      }
    }
  })
}

function swapMeshGroup(scene: THREE.Scene, next: THREE.Group) {
  // Iterate backwards: children are removed while traversing.
  for (let i = scene.children.length - 1; i >= 0; i--) {
    const child = scene.children[i]
    if (child?.userData.meshGroup) {
      scene.remove(child)
      disposeGroup(child)
    }
  }
  next.userData.meshGroup = true
  scene.add(next)
}

function normalizeUrlInput(input: string) {
  let value = input
    .replaceAll(/\r?\n/g, "")
    .trim()
    .replaceAll(/^['"]|['"]$/g, "")

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

const layerSliderStyleHtml = {
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
}

function useLitematicaViewer({ url, height = 400 }: LitematicaViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const orbitRef = useRef<OrbitControls | null>(null)
  const flyRef = useRef<PointerLockControls | null>(null)
  const nucRef = useRef<NucleationModule | null>(null)
  const schematicRef = useRef<Schematic | null>(null)
  const packRef = useRef<ResourcePack | null>(null)
  const tightRef = useRef({ x: 1, y: 1, z: 1 })
  const loadTokenRef = useRef(0)
  const remeshTokenRef = useRef(0)
  const needsRenderRef = useRef(true)
  const lastUnlockAtRef = useRef(Number.NEGATIVE_INFINITY)
  const isFlyEnabledRef = useRef(false)
  const lastFrameTimeRef = useRef(0)

  const { resolvedTheme } = useTheme()
  const backgroundColor = resolvedTheme === "dark" ? 0x101826 : 0xf5f4ef
  const backgroundColorRef = useRef(backgroundColor)
  useEffect(() => {
    backgroundColorRef.current = backgroundColor
  }, [backgroundColor])

  const [maxLayer, setMaxLayer] = useState(0)
  const [sliderLayer, setSliderLayer] = useState(0)
  const [targetLayer, setTargetLayer] = useState<number | "all">("all")
  const [layerMode, setLayerMode] = useState<"single" | "below">("below")
  const [schematicReady, setSchematicReady] = useState(false)
  const [loadError, setLoadError] = useState<LoadError | null>(null)
  const [isFlyMode, setIsFlyMode] = useState(false)
  const [isFlyEnabled, setIsFlyEnabled] = useState(false)
  const [prevUrl, setPrevUrl] = useState(url)

  // Reset viewer state inline when `url` changes so users do not briefly
  // see stale UI between commits. See:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (url !== prevUrl) {
    setPrevUrl(url)
    setSchematicReady(false)
    setTargetLayer("all")
    setLoadError(null)
    setIsFlyMode(false)
    setIsFlyEnabled(false)
  }

  const toggleFlyMode = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()

    const canvas = canvasRef.current
    if (!canvas) return

    if (isFlyEnabledRef.current) {
      isFlyEnabledRef.current = false
      setIsFlyEnabled(false)
      if (document.pointerLockElement === canvas) document.exitPointerLock()
      lastUnlockAtRef.current = performance.now()
      return
    }

    isFlyEnabledRef.current = true
    setIsFlyEnabled(true)

    const elapsedSinceUnlock = performance.now() - lastUnlockAtRef.current
    if (elapsedSinceUnlock < POINTER_LOCK_COOLDOWN_MS) return

    const lockResult = canvas.requestPointerLock()
    if (lockResult && typeof lockResult.catch === "function") {
      lockResult.catch(() => {
        // Swallow rejected pointer lock promises; state is handled by events.
      })
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // three's OrbitControls calls setPointerCapture unguarded (r184,
    // OrbitControls.js:1550); a pointercancel race makes the pointerId
    // inactive and the throw would abort its own drag setup mid-handler.
    const originalSetPointerCapture = canvas.setPointerCapture.bind(canvas)
    canvas.setPointerCapture = (pointerId: number) => {
      try {
        originalSetPointerCapture(pointerId)
      } catch {}
    }
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    const flyKeys = new Set<string>()
    renderer.setSize(canvas.clientWidth || 300, canvas.clientHeight || 400, false)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(backgroundColorRef.current)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x22262e, 1.1))
    const sun = new THREE.DirectionalLight(0xffffff, 1.4)
    sun.position.set(1, 1.6, 0.8)
    scene.add(sun)

    const camera = new THREE.PerspectiveCamera(
      50,
      (canvas.clientWidth || 300) / (canvas.clientHeight || 400),
      0.1,
      10000
    )
    camera.position.set(10, 10, 10)

    const orbit = new OrbitControls(camera, canvas)
    orbit.enableDamping = true

    const fly = new PointerLockControls(camera, canvas)
    fly.addEventListener("lock", () => setIsFlyMode(true))
    fly.addEventListener("unlock", () => {
      lastUnlockAtRef.current = performance.now()
      setIsFlyMode(false)
    })

    rendererRef.current = renderer
    sceneRef.current = scene
    cameraRef.current = camera
    orbitRef.current = orbit
    flyRef.current = fly
    needsRenderRef.current = true

    const resizeObserver = new ResizeObserver(() => {
      const width = canvas.clientWidth
      const heightPx = canvas.clientHeight
      if (width === 0 || heightPx === 0) return
      renderer.setSize(width, heightPx, false)
      camera.aspect = width / heightPx
      camera.updateProjectionMatrix()
      needsRenderRef.current = true
    })
    resizeObserver.observe(canvas)

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isFlyEnabledRef.current) return
      if (event.code === "Space") event.preventDefault()
      flyKeys.add(event.code)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      flyKeys.delete(event.code)
    }
    const onClick = () => {
      if (!isFlyEnabledRef.current) return
      if (document.pointerLockElement === canvas) return
      const elapsedSinceUnlock = performance.now() - lastUnlockAtRef.current
      if (elapsedSinceUnlock < POINTER_LOCK_COOLDOWN_MS) return
      const lockResult = canvas.requestPointerLock()
      if (lockResult && typeof lockResult.catch === "function") {
        lockResult.catch(() => {})
      }
    }
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("keyup", onKeyUp)
    canvas.addEventListener("click", onClick)

    const loop = (timeMs: number) => {
      const dt = Math.min((timeMs - lastFrameTimeRef.current) / 1000, 0.1)
      lastFrameTimeRef.current = timeMs

      let dirty = needsRenderRef.current

      if (isFlyEnabledRef.current && fly.isLocked && dt > 0) {
        const sprint = flyKeys.has("ShiftLeft") ? SPRINT_MULTIPLIER : 1
        const distance = MOVE_SPEED * sprint * dt
        const forward = flyKeys.has("KeyW") ? 1 : flyKeys.has("KeyS") ? -1 : 0
        const right = flyKeys.has("KeyD") ? 1 : flyKeys.has("KeyA") ? -1 : 0
        const up = flyKeys.has("Space") ? 1 : flyKeys.has("KeyC") ? -1 : 0
        if (forward !== 0) fly.moveForward(forward * distance)
        if (right !== 0) fly.moveRight(right * distance)
        if (up !== 0) {
          camera.position.y += up * distance
          dirty = true
        }
        if (forward !== 0 || right !== 0) dirty = true
      }

      const orbitMoved = orbit.update()
      if (orbitMoved || dirty) {
        renderer.render(scene, camera)
        needsRenderRef.current = false
      }
    }
    lastFrameTimeRef.current = performance.now()
    renderer.setAnimationLoop(loop)
    return () => {
      renderer.setAnimationLoop(null)
      resizeObserver.disconnect()
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("keyup", onKeyUp)
      canvas.removeEventListener("click", onClick)
      flyKeys.clear()
      fly.dispose()
      orbit.dispose()
      disposeGroup(scene)
      renderer.dispose()
      rendererRef.current = null
      sceneRef.current = null
      cameraRef.current = null
      orbitRef.current = null
      flyRef.current = null
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.background = new THREE.Color(backgroundColor)
    needsRenderRef.current = true
  }, [backgroundColor])

  // Keep the 16.9 MB WASM engine in a lazy chunk; this is its only entry point.
  useEffect(() => {
    let cancelled = false
    const loadToken = ++loadTokenRef.current
    const controller = new AbortController()
    const cleanUrl = normalizeUrlInput(url)
    const proxyUrl = `/api/litematica-download?${new URLSearchParams({
      url: cleanUrl,
      ts: String(Date.now()),
    }).toString()}`

    const run = async () => {
      setSchematicReady(false)
      setLoadError(null)

      let nuc: NucleationModule
      try {
        nuc = await import("nucleation")
      } catch (error) {
        if (cancelled) return
        console.error("Error importing nucleation:", error)
        setLoadError("FAILED")
        return
      }
      if (cancelled) return
      if (loadToken !== loadTokenRef.current) return
      nucRef.current = nuc
      let arrayBuffer: ArrayBuffer
      try {
        const response = await fetch(proxyUrl, {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch schematic: ${response.status}`)
        }
        arrayBuffer = await response.arrayBuffer()
      } catch (error) {
        if (cancelled) return
        if (error instanceof DOMException && error.name === "AbortError") return
        console.error("Error fetching schematic:", error)
        setLoadError("FAILED")
        return
      }
      if (cancelled) return
      if (loadToken !== loadTokenRef.current) return
      const fileName = cleanUrl.split("/").pop() || "schematic.litematic"
      const bytes = new Uint8Array(arrayBuffer)

      let schematic: Schematic
      let pack: ResourcePack
      try {
        schematic = loadSchematicByFileName(nuc, fileName, [...bytes])
        pack = await getSharedResourcePack(nuc)
      } catch (error) {
        if (cancelled) return
        console.error("Error parsing schematic:", error)
        setLoadError("FAILED")
        return
      }
      if (cancelled) return
      if (loadToken !== loadTokenRef.current) return

      const tight = schematic.tightDimensions()
      tightRef.current = { x: Math.max(1, tight.x), y: Math.max(1, tight.y), z: Math.max(1, tight.z) }
      let glb: Uint8Array
      let bounds: Bounds
      try {
        const meshed = meshSchematic(nuc, schematic, pack, { mode: "all" }, tightRef.current)
        glb = meshed.glb
        bounds = meshed.bounds
      } catch (error) {
        if (cancelled) return
        console.error("Error meshing schematic:", error)
        setLoadError("TOO_DETAILED")
        return
      }
      if (cancelled) return
      if (loadToken !== loadTokenRef.current) return

      schematicRef.current = schematic
      packRef.current = pack
      const scene = sceneRef.current
      if (!scene) return

      try {
        const group = await parseGlb(glb)
        if (cancelled || loadToken !== loadTokenRef.current) {
          disposeGroup(group)
          return
        }
        swapMeshGroup(scene, group)
      } catch (error) {
        if (cancelled) return
        console.error("Error loading mesh:", error)
        setLoadError("TOO_DETAILED")
        return
      }
      if (cancelled) return
      const widthX = bounds.maxX - bounds.minX
      const widthZ = bounds.maxZ - bounds.minZ
      const grid = new THREE.GridHelper(
        Math.max(widthX, widthZ),
        Math.max(Math.round(Math.max(widthX, widthZ)), 10),
        0x475569,
        0x334155
      )
      grid.position.set(
        (bounds.minX + bounds.maxX) / 2,
        bounds.minY - 0.5,
        (bounds.minZ + bounds.maxZ) / 2
      )
      grid.name = "litematica-grid"
      const previousGrid = scene.getObjectByName("litematica-grid")
      if (previousGrid) scene.remove(previousGrid)
      scene.add(grid)

      const camera = cameraRef.current
      const orbit = orbitRef.current
      if (camera && orbit) {
        const centerX = (bounds.minX + bounds.maxX) / 2
        const centerY = (bounds.minY + bounds.maxY) / 2
        const centerZ = (bounds.minZ + bounds.maxZ) / 2
        const extent = Math.max(widthX, bounds.maxY - bounds.minY, widthZ, 1)
        camera.position.set(centerX + extent, centerY + extent * 0.8, centerZ + extent)
        orbit.target.set(centerX, centerY, centerZ)
        orbit.update()
      }
      const topLayer = Math.max(0, tightRef.current.y - 1)
      setMaxLayer(topLayer)
      setSliderLayer(topLayer)
      setTargetLayer("all")
      setSchematicReady(true)
    }

    void run()

    return () => {
      cancelled = true
      controller.abort()
      setSchematicReady(false)
      schematicRef.current = null
      packRef.current = null
    }
  }, [url])

  useEffect(() => {
    if (!schematicReady) return
    const nuc = nucRef.current
    const schematic = schematicRef.current
    const pack = packRef.current
    const scene = sceneRef.current
    if (!nuc || !schematic || !pack || !scene) return
    let cancelled = false
    const token = ++remeshTokenRef.current
    const range: LayerRange =
      targetLayer === "all"
        ? { mode: "all" }
        : layerMode === "single"
          ? {
              mode: "single",
              y: Math.max(0, Math.min(targetLayer, tightRef.current.y - 1)),
            }
          : {
              mode: "below",
              y: Math.max(0, Math.min(targetLayer, tightRef.current.y - 1)),
            }

    void (async () => {
      try {
        const { glb } = meshSchematic(nuc, schematic, pack, range, tightRef.current)
        if (cancelled || token !== remeshTokenRef.current) return
        const group = await parseGlb(glb)
        if (cancelled || token !== remeshTokenRef.current) {
          disposeGroup(group)
          return
        }
        swapMeshGroup(scene, group)
        needsRenderRef.current = true
      } catch (error) {
        if (cancelled) return
        // Keep the last good mesh visible; meshing failures are wasm traps.
        console.error("Failed to re-mesh layer range:", error)
        setLoadError("TOO_DETAILED")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [schematicReady, targetLayer, layerMode])

  const commitLayerSelection = useCallback(() => {
    if (!schematicReady) return
    setTargetLayer(sliderLayer)
  }, [schematicReady, sliderLayer])

  const canvasStyle = useMemo(
    (): React.CSSProperties => ({
      cursor: isFlyMode ? "crosshair" : "pointer",
      height: typeof height === "number" ? height + "px" : height,
    }),
    [isFlyMode, height]
  )

  return {
    canvasRef,
    canvasStyle,
    commitLayerSelection,
    isFlyEnabled,
    isFlyMode,
    layerMode,
    loadError,
    maxLayer,
    setLayerMode,
    setSliderLayer,
    setTargetLayer,
    sliderLayer,
    targetLayer,
    toggleFlyMode,
  }
}

export default function LitematicaViewer(props: LitematicaViewerProps) {
  const {
    canvasRef,
    canvasStyle,
    commitLayerSelection,
    isFlyEnabled,
    isFlyMode,
    layerMode,
    loadError,
    maxLayer,
    setLayerMode,
    setSliderLayer,
    setTargetLayer,
    sliderLayer,
    targetLayer,
    toggleFlyMode,
  } = useLitematicaViewer(props)

  return (
    <LitematicaViewerSurface
      canvasRef={canvasRef}
      canvasStyle={canvasStyle}
      commitLayerSelection={commitLayerSelection}
      isFlyEnabled={isFlyEnabled}
      isFlyMode={isFlyMode}
      layerMode={layerMode}
      loadError={loadError}
      maxLayer={maxLayer}
      onLayerModeChange={setLayerMode}
      onSliderLayerChange={setSliderLayer}
      onTargetLayerChange={setTargetLayer}
      sliderLayer={sliderLayer}
      targetLayer={targetLayer}
      toggleFlyMode={toggleFlyMode}
    />
  )
}

interface LitematicaViewerSurfaceProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  canvasStyle: React.CSSProperties
  commitLayerSelection: () => void
  isFlyEnabled: boolean
  isFlyMode: boolean
  layerMode: "single" | "below"
  loadError: LoadError | null
  maxLayer: number
  onLayerModeChange: (mode: "single" | "below") => void
  onSliderLayerChange: (layer: number) => void
  onTargetLayerChange: (layer: number | "all") => void
  sliderLayer: number
  targetLayer: number | "all"
  toggleFlyMode: (event: MouseEvent<HTMLButtonElement>) => void
}

function LitematicaViewerSurface({
  canvasRef,
  canvasStyle,
  commitLayerSelection,
  isFlyEnabled,
  isFlyMode,
  layerMode,
  loadError,
  maxLayer,
  onLayerModeChange,
  onSliderLayerChange,
  onTargetLayerChange,
  sliderLayer,
  targetLayer,
  toggleFlyMode,
}: LitematicaViewerSurfaceProps) {
  const t = useTranslations("IconActions")

  return (
    <div
      className="
      group relative my-8 w-full rounded-sm border-2 guide-line bg-tech-bg
      font-mono
    ">
      <canvas
        ref={canvasRef}
        aria-label="Litematica schematic 3D viewer"
        className="block w-full outline-none"
        style={canvasStyle}
      />
      <IconButton label={isFlyEnabled ? t("exitFly") : t("enterFly")} aria-pressed={isFlyEnabled} onClick={toggleFlyMode} variant="outline" className="absolute top-4 right-4 z-20 bg-surface-overlay">{isFlyEnabled ? <LogOut aria-hidden /> : <ScanEye aria-hidden />}</IconButton>
      <div className="pointer-events-none absolute top-4 left-4 flex items-center gap-3">
        <span className="shrink-0 border border-tech-main/40 bg-surface-overlay/70 px-2 py-0.5 text-xs font-bold tracking-wider text-tech-main shadow-sm backdrop-blur-sm">
          [LITEMATICA]
        </span>
        <span className="hidden text-[10px] tracking-widest text-tech-main/80 uppercase md:inline-block">
          INTERACTIVE BLUEPRINT
        </span>
      </div>
      {loadError ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="border-tech-main/40 bg-surface-overlay/90 text-tech-main shadow-sm absolute border px-3 py-1.5 text-xs font-bold tracking-wider backdrop-blur-md">
            {loadError === "TOO_DETAILED"
              ? "SCHEMATIC TOO DETAILED — MESH LIMIT REACHED"
              : "SCHEMATIC LOAD FAILED"}
          </div>
        </div>
      ) : null}
      {maxLayer > 0 && (
        <LitematicaLayerControls
          commitLayerSelection={commitLayerSelection}
          isFlyEnabled={isFlyEnabled}
          layerMode={layerMode}
          maxLayer={maxLayer}
          onLayerModeChange={onLayerModeChange}
          onSliderLayerChange={onSliderLayerChange}
          onTargetLayerChange={onTargetLayerChange}
          sliderLayer={sliderLayer}
          targetLayer={targetLayer}
        />
      )}
      <LitematicaControlsHint
        isFlyEnabled={isFlyEnabled}
        isFlyMode={isFlyMode}
      />
    </div>
  )
}

interface LitematicaLayerControlsProps {
  commitLayerSelection: () => void
  isFlyEnabled: boolean
  layerMode: "single" | "below"
  maxLayer: number
  onLayerModeChange: (mode: "single" | "below") => void
  onSliderLayerChange: (layer: number) => void
  onTargetLayerChange: (layer: number | "all") => void
  sliderLayer: number
  targetLayer: number | "all"
}

function LitematicaLayerControls({
  commitLayerSelection,
  isFlyEnabled,
  layerMode,
  maxLayer,
  onLayerModeChange,
  onSliderLayerChange,
  onTargetLayerChange,
  sliderLayer,
  targetLayer,
}: LitematicaLayerControlsProps) {
  const t = useTranslations("IconActions")
  return (
    <div
      className={`absolute right-4 bottom-16 z-10 w-[250px] border border-tech-main/60 bg-surface-overlay/90 p-3 text-tech-main shadow-sm backdrop-blur-md transition-[opacity,transform,translate] motion-reduce:transition-none ${
        isFlyEnabled ? "pointer-events-none translate-x-2 opacity-0" : "opacity-100"
      }`}>
      <div className="mb-2 flex items-center justify-between border-b guide-line pb-1">
        <span className="text-[10px] font-bold tracking-widest uppercase">
          {t("layerFilter")}
        </span>
        <IconButton label={t("resetLayers")} onClick={() => { onTargetLayerChange("all"); onSliderLayerChange(maxLayer) }}><RotateCcw aria-hidden /></IconButton>
      </div>
      <div className="mb-2 flex items-center justify-between text-xs font-bold">
        <span>LAYER {targetLayer === "all" ? "ALL" : targetLayer}</span>
        {targetLayer !== "all" && targetLayer !== sliderLayer && (
          <span className="text-[10px] opacity-70">PENDING {sliderLayer}</span>
        )}
      </div>
      <div className="mb-3 flex border border-tech-main/40 text-[10px] font-bold uppercase">
        <IconButton label={t("singleLayer")} aria-pressed={layerMode === "single"} onClick={() => onLayerModeChange("single")} className="flex-1"><Square aria-hidden /></IconButton>
        <IconButton label={t("layersBelow")} aria-pressed={layerMode === "below"} onClick={() => onLayerModeChange("below")} className="flex-1"><Layers aria-hidden /></IconButton>
      </div>
      <input
        type="range"
        min={0}
        max={maxLayer}
        value={sliderLayer}
        aria-label="Layer selection"
        onChange={(event) => onSliderLayerChange(Number(event.target.value))}
        onPointerUp={commitLayerSelection}
        onMouseUp={commitLayerSelection}
        onTouchEnd={commitLayerSelection}
        onKeyUp={commitLayerSelection}
        data-litematica-layer-slider
        className="w-full cursor-ew-resize"
      />
      <div className="mt-2 flex justify-end">
        <IconButton label={t("applyLayer")} onClick={commitLayerSelection}><Check aria-hidden /></IconButton>
      </div>
      <style dangerouslySetInnerHTML={layerSliderStyleHtml} />
    </div>
  )
}

function LitematicaControlsHint({
  isFlyEnabled,
  isFlyMode,
}: {
  isFlyEnabled: boolean
  isFlyMode: boolean
}) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 opacity-80 transition-opacity duration-300 group-hover:opacity-100">
      <div className="flex items-center gap-4 rounded-sm border guide-line bg-surface-overlay/80 px-3 py-1.5 text-xs whitespace-nowrap text-tech-main/80 shadow-sm backdrop-blur-md">
        {isFlyEnabled ? (
          <>
            <LitematicaControlKey label="WASD" instruction="Move" />
            <LitematicaControlDivider />
            <LitematicaControlKey label="SPACE" instruction="Up" />
            <LitematicaControlDivider />
            <LitematicaControlKey label="C" instruction="Down" />
            <LitematicaControlDivider />
            <LitematicaControlKey label="ESC" instruction="Unlock" />
            {!isFlyMode && (
              <>
                <LitematicaControlDivider />
                <LitematicaControlKey label="Click" instruction="Lock" />
              </>
            )}
          </>
        ) : (
          <>
            <LitematicaControlKey label="Left" instruction="Rotate" />
            <LitematicaControlDivider />
            <LitematicaControlKey label="Right" instruction="Pan" />
            <LitematicaControlDivider />
            <LitematicaControlKey label="Wheel" instruction="Zoom" />
          </>
        )}
      </div>
    </div>
  )
}

function LitematicaControlDivider() {
  return (
    <Separator
      orientation="vertical"
      className="bg-tech-main/30 h-3 opacity-60"
    />
  )
}

function LitematicaControlKey({
  instruction,
  label,
}: {
  instruction: string
  label: string
}) {
  return (
    <span className="flex items-center gap-1.5">
      <Kbd>{label}</Kbd> {instruction}
    </span>
  )
}
