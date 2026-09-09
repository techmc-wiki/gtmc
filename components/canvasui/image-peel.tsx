"use client"

import { useEffect, useEffectEvent, useRef, type ReactNode } from "react"
import * as THREE from "three"

// Paper geometry and lighting adapted from Canvas UI Peel by David Haz.
// https://canvasui.dev/docs/components/peel (MIT + Commons Clause)
// A direct image texture keeps this version independent of HTML-in-canvas.

const SHEET_VERT = `precision highp float;
layout(location = 0) in vec2 aGrid;
uniform vec2 uRes;
uniform float uSide;
uniform float uPeel;
uniform float uReveal;
uniform float uCurl;
uniform float uBow;
uniform float uFocal;
uniform float uZone;
uniform float uBulge;
uniform vec2 uPointer;
out vec2 vUv;
out float vShade;
out vec2 vSide;

const float PI = 3.1415926;

void main () {
  vUv = aGrid;
  vec2 p = aGrid * uRes;
  float crossLen = (uSide < 1.5) ? uRes.y : uRes.x;
  float u; float v;
  if (uSide < 0.5) { u = p.x; v = p.y; }
  else if (uSide < 1.5) { u = uRes.x - p.x; v = p.y; }
  else if (uSide < 2.5) { u = p.y; v = p.x; }
  else { u = uRes.y - p.y; v = p.x; }

  float A = clamp(uPeel, 0.0, 1.0);
  float f = A * uReveal;
  float R = max(uCurl * A, 0.001);
  float c0 = f + R;

  float dvB = (uPointer.y - v) / max(crossLen * 0.28, 1.0);
  float prox = clamp(1.0 - uPointer.x / max(c0 + uZone, 1.0), 0.0, 1.0);
  float c = c0 + uBulge * A * prox * prox * exp(-dvB * dvB);

  float x = u;
  float z = 0.0;
  float sh = 0.0;
  if (A > 0.001 && u < c) {
    float theta = (c - u) / R;
    if (theta <= PI) {
      x = c - R * sin(theta);
      z = R * (1.0 - cos(theta));
    } else {
      x = c + (theta - PI) * R;
      z = 2.0 * R;
    }
    sh = sin(clamp(theta, 0.0, PI));
  }
  z += uBow * A * sin(PI * v / max(crossLen, 1.0)) * clamp(z / max(R, 1.0), 0.0, 1.5);
  z = clamp(z, -uFocal * 0.2, uFocal * 0.45);
  vShade = sh * smoothstep(0.0, 0.08, A);
  vSide = vec2(u, v);

  vec2 q;
  if (uSide < 0.5) q = vec2(x, v);
  else if (uSide < 1.5) q = vec2(uRes.x - x, v);
  else if (uSide < 2.5) q = vec2(v, x);
  else q = vec2(v, uRes.y - x);

  vec2 ndc = (q / uRes) * 2.0 - 1.0;
  ndc.y = -ndc.y;
  float w = (uFocal - z) / uFocal;
  gl_Position = vec4(ndc, -z / uFocal, w);
}`

const SHEET_FRAG = `precision highp float;
in vec2 vUv;
in float vShade;
in vec2 vSide;
out vec4 outColor;
uniform sampler2D uContent;
uniform float uShade;
uniform float uMaxX;
uniform float uShine;
uniform vec3 uShineColor;
uniform float uCross;
uniform float uSpan;
uniform vec2 uPointer;

void main () {
  vec2 uv = clamp(vUv, vec2(0.001), vec2(uMaxX - 0.001, 0.999));
  vec4 tex = texture(uContent, uv);
  float sh = 1.0 - clamp(uShade, 0.0, 1.0) * 0.7 * pow(max(vShade, 0.0), 1.3);
  float du = max(vSide.x, 0.0);
  float line = exp(-du / 2.5) + exp(-du / 18.0) * 0.25;
  float dv = (vSide.y - uPointer.y) / max(uCross * 0.45, 1.0);
  float prox = clamp(1.0 - uPointer.x / max(uSpan, 1.0), 0.0, 1.0);
  float shine = uShine * line * exp(-dv * dv) * prox * prox;
  vec3 paper = !gl_FrontFacing ? tex.rgb : mix(vec3(0.961, 0.957, 0.937), tex.rgb, 0.12);
  vec3 rgb = mix(paper * sh, uShineColor, clamp(shine, 0.0, 1.0));
  outColor = vec4(rgb * tex.a, tex.a);
}`

export function ImagePeel({
  src,
  children,
  opened,
  onOpenChange,
}: {
  src: string
  children: ReactNode
  opened: boolean
  onOpenChange: (opened: boolean) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const setOpenRef = useRef<((open: boolean) => void) | null>(null)
  const changeOpen = useEffectEvent(onOpenChange)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const image = imageRef.current
    const target = root?.closest("button")
    if (!root || !canvas || !image || !target) return

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      })
    } catch {
      return
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

    function render() {
      renderer.render(scene, camera)
    }

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
      render()
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
      width = root!.clientWidth
      height = root!.clientHeight
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
      if (disposed || !image!.naturalWidth) return
      texture.needsUpdate = true
      resize()
      render()
      ready = true
      root!.dataset.peelReady = String(!motion.matches)
      wake()
    }

    setOpenRef.current = (open) => {
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
      const rect = root!.getBoundingClientRect()
      if (event.pointerType === "touch") {
        if (!touch || event.pointerId !== touch.id || motion.matches) return
        const dx = touch.x - event.clientX
        if (Math.abs(dx) < 8 && !touch.dragging) return
        touch.dragging = true
        target!.setPointerCapture(event.pointerId)
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
        changeOpen(desired >= 0.5)
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
      root!.dataset.peelReady = String(ready && !motion.matches && !contextLost)
      amount = desired = pinned ? 1 : 0
      uniforms.uPeel.value = amount
      wake()
    }

    function loseContext(event: Event) {
      event.preventDefault()
      contextLost = true
      root!.dataset.peelReady = "false"
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

    return () => {
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
      setOpenRef.current = null
      motion.removeEventListener("change", motionChange)
      document.removeEventListener("visibilitychange", wake)
      canvas.removeEventListener("webglcontextlost", loseContext)
      canvas.removeEventListener("webglcontextrestored", restoreContext)
      texture.dispose()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [src])

  useEffect(() => {
    setOpenRef.current?.(opened)
  }, [opened, src])

  return (
    <div
      ref={rootRef}
      data-peel-open={opened}
      className="group/peel relative h-full w-full"
      aria-hidden="true">
      <div className="absolute inset-0 overflow-hidden">{children}</div>
      {/* The image stays visible until the GPU texture is ready, and is the
          complete fallback for reduced motion or unavailable WebGL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt=""
        className="relative h-full w-full object-contain group-data-[peel-open=true]/peel:invisible group-data-[peel-ready=true]/peel:invisible"
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0 group-data-[peel-ready=true]/peel:opacity-100 motion-reduce:hidden"
      />
    </div>
  )
}
