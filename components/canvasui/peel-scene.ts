import * as THREE from "three"
import { SHEET_FRAG, SHEET_VERT } from "@/components/canvasui/peel-shaders"

/** A live peel surface. `setOpen` drives the page turn; `dispose` releases the GPU. */
export interface PeelScene {
  setOpen: (opened: boolean) => void
  dispose: () => void
}

interface PeelSceneOptions {
  root: HTMLElement | null
  canvas: HTMLCanvasElement | null
  image: HTMLImageElement | null
  onOpenChange: (opened: boolean) => void
}

/**
 * Builds the peel scene around an already-rendered root/canvas/image triplet,
 * where `root` sits inside the button that owns the interaction. Returns null
 * when the markup is incomplete or WebGL is unavailable, leaving the plain
 * image as the complete fallback.
 */
export function createPeelScene(options: PeelSceneOptions): PeelScene | null {
  const {
    canvas: canvasEl,
    image: imageEl,
    root: rootEl,
    onOpenChange,
  } = options
  const button = rootEl?.closest("button")
  if (!rootEl || !canvasEl || !imageEl || !button) return null

  const root: HTMLElement = rootEl
  const canvas: HTMLCanvasElement = canvasEl
  const image: HTMLImageElement = imageEl
  const target: HTMLButtonElement = button

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    })
  } catch {
    return null
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  const texture = new THREE.Texture(image)
  texture.flipY = false
  texture.minFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  const geometry = new THREE.PlaneGeometry(1, 1, 96, 96)
  geometry.setAttribute("aGrid", geometry.getAttribute("uv"))
  const uniforms = {
    uContent: { value: texture },
    uRes: { value: new THREE.Vector2() },
    uSide: { value: 1 },
    uPeel: { value: 0 },
    uReveal: { value: 0 },
    uCurl: { value: 0 },
    uBow: { value: 0 },
    uFocal: { value: 1600 },
    uZone: { value: 0 },
    uBulge: { value: 0 },
    uShade: { value: 0.65 },
    uMaxX: { value: 1 },
    uShine: { value: 0.18 },
    uShineColor: { value: new THREE.Vector3(1, 1, 1) },
    uCross: { value: 0 },
    uSpan: { value: 0 },
    uPointer: { value: new THREE.Vector2(10000, 0) },
  }
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: SHEET_VERT,
    fragmentShader: SHEET_FRAG,
    uniforms,
    side: THREE.DoubleSide,
    transparent: true,
    forceSinglePass: true,
  })
  const scene = new THREE.Scene()
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  scene.add(mesh)
  const camera = new THREE.Camera()
  let width = 1
  let height = 1
  let ready = false
  let visible = true
  let disposed = false
  let contextLost = false
  let frameId = 0
  let previous = 0
  let amount = 0
  let desired = 0
  let pinned = false
  let touch: {
    id: number
    x: number
    amount: number
    dragging: boolean
  } | null = null
  let suppressClickUntil = 0
  const pointer = new THREE.Vector2(10000, 0)

  function frame(now: number) {
    frameId = 0
    if (disposed || !ready || !visible || document.hidden || contextLost) {
      return
    }
    const delta = Math.min((now - previous) / 1000, 0.05)
    previous = now
    amount += (desired - amount) * (1 - Math.exp(-delta / 0.18))
    uniforms.uPointer.value.lerp(pointer, 1 - Math.exp(-delta / 0.1))
    const settled =
      Math.abs(desired - amount) < 0.0005 &&
      uniforms.uPointer.value.distanceTo(pointer) < 0.1
    if (settled) {
      amount = desired
      uniforms.uPointer.value.copy(pointer)
    }
    uniforms.uPeel.value = amount
    renderer.render(scene, camera)
    if (!settled) frameId = requestAnimationFrame(frame)
  }

  function wake() {
    if (
      frameId ||
      !ready ||
      !visible ||
      document.hidden ||
      contextLost ||
      disposed
    ) {
      return
    }
    previous = performance.now()
    frameId = requestAnimationFrame(frame)
  }

  function resize() {
    width = root.clientWidth
    height = root.clientHeight
    renderer.setSize(width, height, false)
    uniforms.uRes.value.set(width, height)
    uniforms.uReveal.value = width * 0.57
    uniforms.uCurl.value = width * 0.13
    uniforms.uBow.value = height * 0.045
    uniforms.uZone.value = width * 0.7
    uniforms.uBulge.value = width * 0.07
    uniforms.uCross.value = height
    uniforms.uSpan.value = width
    wake()
  }

  function load() {
    if (disposed || !image.naturalWidth) return
    texture.needsUpdate = true
    resize()
    renderer.render(scene, camera)
    ready = true
    root.dataset.peelReady = String(!motion.matches)
    wake()
  }

  function setOpen(open: boolean) {
    pinned = open
    desired = open ? 1 : 0
    pointer.set(width * 0.05, height * 0.55)
    if (motion.matches) {
      // An immediate page swap keeps the preview available without motion.
      return
    }
    wake()
  }

  function down(event: PointerEvent) {
    if (event.pointerType !== "touch") return
    touch = { id: event.pointerId, x: event.clientX, amount, dragging: false }
  }

  function move(event: PointerEvent) {
    const rect = root.getBoundingClientRect()
    if (event.pointerType === "touch") {
      if (!touch || event.pointerId !== touch.id || motion.matches) return
      const dx = touch.x - event.clientX
      if (Math.abs(dx) < 8 && !touch.dragging) return
      touch.dragging = true
      target.setPointerCapture(event.pointerId)
      desired = Math.max(0, Math.min(1, touch.amount + dx / (width * 0.65)))
      pointer.set(width * (1 - desired), event.clientY - rect.top)
    } else {
      if (motion.matches || pinned) return
      const distance = Math.max(0, rect.right - event.clientX)
      pointer.set(distance, event.clientY - rect.top)
      desired = Math.max(0, Math.min(1, 1 - distance / (width * 0.85)))
    }
    wake()
  }

  function up(event: PointerEvent) {
    if (!touch || event.pointerId !== touch.id) return
    if (touch.dragging) {
      suppressClickUntil = performance.now() + 500
      onOpenChange(desired >= 0.5)
      desired = desired >= 0.5 ? 1 : 0
    }
    touch = null
    wake()
  }

  function cancel() {
    touch = null
    desired = pinned ? 1 : 0
    wake()
  }

  function click(event: MouseEvent) {
    if (event.detail > 0 && performance.now() < suppressClickUntil) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  function leave() {
    if (touch) return
    desired = pinned ? 1 : 0
    wake()
  }

  function motionChange() {
    root.dataset.peelReady = String(ready && !motion.matches && !contextLost)
    amount = desired = pinned ? 1 : 0
    uniforms.uPeel.value = amount
    wake()
  }

  function loseContext(event: Event) {
    event.preventDefault()
    contextLost = true
    root.dataset.peelReady = "false"
  }

  function restoreContext() {
    contextLost = false
    load()
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(root)
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    wake()
  })
  intersection.observe(root)
  image.addEventListener("load", load)
  target.addEventListener("pointermove", move, { passive: true })
  target.addEventListener("pointerleave", leave)
  target.addEventListener("pointerdown", down)
  target.addEventListener("pointerup", up)
  target.addEventListener("pointercancel", cancel)
  target.addEventListener("click", click, true)
  motion.addEventListener("change", motionChange)
  document.addEventListener("visibilitychange", wake)
  canvas.addEventListener("webglcontextlost", loseContext)
  canvas.addEventListener("webglcontextrestored", restoreContext)
  if (image.complete) load()

  return {
    setOpen,
    dispose() {
      disposed = true
      cancelAnimationFrame(frameId)
      root.dataset.peelReady = "false"
      resizeObserver.disconnect()
      intersection.disconnect()
      image.removeEventListener("load", load)
      target.removeEventListener("pointermove", move)
      target.removeEventListener("pointerleave", leave)
      target.removeEventListener("pointerdown", down)
      target.removeEventListener("pointerup", up)
      target.removeEventListener("pointercancel", cancel)
      target.removeEventListener("click", click, true)
      motion.removeEventListener("change", motionChange)
      document.removeEventListener("visibilitychange", wake)
      canvas.removeEventListener("webglcontextlost", loseContext)
      canvas.removeEventListener("webglcontextrestored", restoreContext)
      texture.dispose()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    },
  }
}
