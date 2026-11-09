import { spawn, type ChildProcess } from "node:child_process"
import crypto from "node:crypto"
import fs from "node:fs"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"
import { z } from "zod"
import { workspacePath } from "@/lib/workspace-paths"

import { toTypstRootPath, writeFileAtomic } from "./artifacts"

const FONTS_DIR = workspacePath("tools", "pdf", "fonts")

const require = createRequire(import.meta.url)
const MERMAID_BUNDLE = require.resolve("mermaid/dist/mermaid.min.js")
const MERMAID_VERSION = z
  .object({ version: z.string().min(1) })
  .parse(
    JSON.parse(
      fs.readFileSync(
        path.join(path.dirname(MERMAID_BUNDLE), "..", "package.json"),
        "utf-8"
      )
    )
  ).version

const FONT_FAMILY = "Geist, Noto Sans SC, sans-serif"

/**
 * Fonts loaded into the render page so mermaid measures labels with the same
 * glyph widths Typst embeds. Without them Chrome measures with its system
 * fallback and nodes come out too narrow for the Typst output.
 */
const MEASURE_FONTS = [
  { family: "Geist", file: "Geist-Regular.ttf" },
  { family: "Noto Sans SC", file: "NotoSansSC-Regular.ttf" },
] as const

/** Light theme, matching the book's white page and `tokens.ts` colours. */
const MERMAID_CONFIG = {
  startOnLoad: false,
  securityLevel: "strict",
  theme: "base",
  htmlLabels: false,
  flowchart: { htmlLabels: false },
  fontFamily: FONT_FAMILY,
  themeVariables: {
    background: "#ffffff",
    fontFamily: FONT_FAMILY,
    primaryColor: "#fcfbf8",
    primaryTextColor: "#20283c",
    primaryBorderColor: "#4a5468",
    lineColor: "#4a5468",
    secondaryColor: "#c9cfdd",
    tertiaryColor: "#f5f4ef",
    edgeLabelBackground: "#ffffff",
  },
} as const

const CHROME_CANDIDATES_MACOS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
]
const CHROME_NAMES_ON_PATH = [
  "chromium",
  "chromium-browser",
  "google-chrome",
  "google-chrome-stable",
]

const LAUNCH_TIMEOUT_MS = 30 * 1000
const CDP_TIMEOUT_MS = 30 * 1000
const RENDER_TIMEOUT_MS = 60 * 1000

const CdpMessage = z.object({
  id: z.number().optional(),
  result: z.unknown().optional(),
  error: z.object({ message: z.string() }).optional(),
})
const TargetCreated = z.object({ targetId: z.string().min(1) })
const SessionAttached = z.object({ sessionId: z.string().min(1) })
const EvaluateResponse = z.object({
  result: z.object({ value: z.unknown().optional() }),
  exceptionDetails: z
    .object({
      text: z.string(),
      exception: z.object({ description: z.string().optional() }).optional(),
    })
    .optional(),
})

/**
 * Renders each Mermaid source to a standalone light-theme SVG whose labels are
 * SVG `<text>` (no foreignObject, which Typst ignores). Results are cached by
 * sha256(source + mermaid version + config). Returns the Typst root-relative
 * path (`/work/...`) of each SVG copied into `outDir`.
 */
export async function renderMermaidSvgs(
  sources: string[],
  opts: { outDir: string; cacheDir: string }
): Promise<Map<string, { path: string }>> {
  const result = new Map<string, { path: string }>()
  const unique = [...new Set(sources)]
  if (unique.length === 0) return result

  await fs.promises.mkdir(opts.cacheDir, { recursive: true })
  await fs.promises.mkdir(opts.outDir, { recursive: true })

  const configKey = JSON.stringify(MERMAID_CONFIG)
  const session = new LazyBrowser()
  try {
    for (const source of unique) {
      const key = crypto
        .createHash("sha256")
        .update(stripUnsupportedLabelTags(source))
        .update("\0")
        .update(MERMAID_VERSION)
        .update("\0")
        .update(configKey)
        .digest("hex")
      const cached = path.join(opts.cacheDir, `${key}.svg`)

      if (!fs.existsSync(cached)) {
        const browser = await session.get()
        const svg = await browser.renderSvg(stripUnsupportedLabelTags(source))
        await writeFileAtomic(cached, svg)
      }

      const output = path.join(opts.outDir, `${key}.svg`)
      await fs.promises.copyFile(cached, output)
      result.set(source, { path: toTypstRootPath(output) })
    }
  } finally {
    await session.close()
  }
  return result
}

class LazyBrowser {
  #browser: ChromeMermaid | undefined

  async get(): Promise<ChromeMermaid> {
    this.#browser ??= await ChromeMermaid.launch()
    return this.#browser
  }

  async close(): Promise<void> {
    await this.#browser?.close()
    this.#browser = undefined
  }
}

/** Minimal Chrome DevTools client: one headless page running mermaid. */
class ChromeMermaid {
  readonly #process: ChildProcess
  readonly #socket: WebSocket
  readonly #profileDir: string
  readonly #pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >()
  #nextId = 1
  #sessionId: string | undefined

  private constructor(
    process: ChildProcess,
    socket: WebSocket,
    profileDir: string
  ) {
    this.#process = process
    this.#socket = socket
    this.#profileDir = profileDir
    socket.addEventListener("message", (event) => {
      const message = CdpMessage.parse(JSON.parse(String(event.data)))
      if (message.id === undefined) return
      const waiter = this.#pending.get(message.id)
      if (!waiter) return
      this.#pending.delete(message.id)
      if (message.error) waiter.reject(new Error(message.error.message))
      else waiter.resolve(message.result)
    })
  }

  static async launch(): Promise<ChromeMermaid> {
    const executable = resolveChromeExecutable()
    const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "gtmc-mermaid-"))
    const child = spawn(
      executable,
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--remote-debugging-port=0",
        `--user-data-dir=${profileDir}`,
        "about:blank",
      ],
      { stdio: ["ignore", "ignore", "pipe"] }
    )
    try {
      const wsUrl = await waitForDevToolsUrl(child)
      const socket = new WebSocket(wsUrl)
      await waitForOpen(socket, wsUrl)
      const browser = new ChromeMermaid(child, socket, profileDir)
      await browser.#initPage()
      return browser
    } catch (error) {
      child.kill("SIGKILL")
      fs.rmSync(profileDir, { recursive: true, force: true })
      throw error
    }
  }

  async #initPage(): Promise<void> {
    const created = TargetCreated.parse(
      await this.#send(
        "Target.createTarget",
        { url: "about:blank" },
        CDP_TIMEOUT_MS
      )
    )
    const attached = SessionAttached.parse(
      await this.#send(
        "Target.attachToTarget",
        { targetId: created.targetId, flatten: true },
        CDP_TIMEOUT_MS
      )
    )
    this.#sessionId = attached.sessionId

    await this.#loadFonts()
    await this.#evaluate(
      fs.readFileSync(MERMAID_BUNDLE, "utf-8"),
      false,
      CDP_TIMEOUT_MS
    )
    await this.#evaluate(
      `globalThis.mermaid.initialize(${JSON.stringify(MERMAID_CONFIG)});
       true`,
      false,
      CDP_TIMEOUT_MS
    )
  }

  async #loadFonts(): Promise<void> {
    for (const { family, file } of MEASURE_FONTS) {
      const base64 = fs
        .readFileSync(path.join(FONTS_DIR, file))
        .toString("base64")
      await this.#evaluate(
        `(async () => {
          const bytes = Uint8Array.from(atob(${JSON.stringify(base64)}), (c) => c.charCodeAt(0));
          const face = new FontFace(${JSON.stringify(family)}, bytes.buffer);
          document.fonts.add(await face.load());
          return true;
        })()`,
        true,
        CDP_TIMEOUT_MS
      )
    }
  }

  async renderSvg(source: string): Promise<string> {
    const svg = z.string().parse(
      await this.#evaluate(
        `(async () => {
          const { svg } = await globalThis.mermaid.render("gtmc-diagram", ${JSON.stringify(source)});
          return svg;
        })()`,
        true,
        RENDER_TIMEOUT_MS
      )
    )
    return toStandaloneSvg(svg)
  }

  async close(): Promise<void> {
    try {
      await this.#send("Browser.close", {}, CDP_TIMEOUT_MS).catch(
        () => undefined
      )
    } finally {
      const alreadyExited =
        this.#process.exitCode !== null || this.#process.signalCode !== null
      const { promise: exited, resolve: onExit } = Promise.withResolvers<void>()
      this.#process.once("exit", () => onExit())
      this.#socket.close()
      this.#process.kill("SIGKILL")
      if (!alreadyExited) await exited
      // Chrome may still be flushing into the profile for a moment after exit.
      await fs.promises.rm(this.#profileDir, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      })
    }
  }

  async #evaluate(
    expression: string,
    awaitPromise: boolean,
    timeoutMs: number
  ): Promise<unknown> {
    const response = EvaluateResponse.parse(
      await this.#send(
        "Runtime.evaluate",
        { expression, awaitPromise, returnByValue: true },
        timeoutMs
      )
    )
    if (response.exceptionDetails) {
      const { exception, text } = response.exceptionDetails
      throw new Error(`Mermaid page error: ${exception?.description ?? text}`)
    }
    return response.result.value
  }

  #send(
    method: string,
    params: Record<string, unknown>,
    timeoutMs: number
  ): Promise<unknown> {
    const id = this.#nextId++
    const { promise, resolve, reject } = Promise.withResolvers<unknown>()
    const timer = setTimeout(() => {
      this.#pending.delete(id)
      reject(new Error(`DevTools ${method} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    this.#pending.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      reject: (error) => {
        clearTimeout(timer)
        reject(error)
      },
    })
    this.#socket.send(
      JSON.stringify({ id, method, params, sessionId: this.#sessionId })
    )
    return promise
  }
}

async function waitForOpen(socket: WebSocket, url: string): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>()
  socket.addEventListener("open", () => resolve(), { once: true })
  socket.addEventListener(
    "error",
    () => reject(new Error(`DevTools socket failed: ${url}`)),
    { once: true }
  )
  return promise
}

async function waitForDevToolsUrl(child: ChildProcess): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>()
  let stderr = ""
  const onData = (chunk: Buffer): void => {
    stderr += chunk.toString("utf-8")
    const match = /DevTools listening on (ws:\/\/\S+)/.exec(stderr)
    if (match) resolve(match[1])
  }
  child.stderr?.on("data", onData)
  child.once("error", (error) => reject(error))
  child.once("exit", (code) =>
    reject(
      new Error(
        `Chrome exited (code ${code}) before exposing DevTools: ${stderr.slice(-500)}`
      )
    )
  )
  const timer = setTimeout(
    () =>
      reject(
        new Error(
          `Chrome did not expose DevTools within ${LAUNCH_TIMEOUT_MS}ms`
        )
      ),
    LAUNCH_TIMEOUT_MS
  )
  try {
    return await promise
  } finally {
    clearTimeout(timer)
    child.stderr?.off("data", onData)
  }
}

function resolveChromeExecutable(): string {
  const fromEnv = process.env.PDF_CHROMIUM
  if (fromEnv) {
    if (!fs.existsSync(fromEnv)) {
      throw new Error(`PDF_CHROMIUM points to a missing file: ${fromEnv}`)
    }
    return fromEnv
  }
  if (process.platform === "darwin") {
    const found = CHROME_CANDIDATES_MACOS.find((candidate) =>
      fs.existsSync(candidate)
    )
    if (found) return found
  }
  const pathDirs = (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter(Boolean)
  for (const name of CHROME_NAMES_ON_PATH) {
    for (const dir of pathDirs) {
      const candidate = path.join(dir, name)
      if (fs.existsSync(candidate)) return candidate
    }
  }
  throw new Error(
    "No Chromium found for Mermaid rendering. Set PDF_CHROMIUM to a Chrome/Chromium executable " +
      "or install Google Chrome (checked macOS app bundles and chromium/google-chrome on PATH)."
  )
}

/**
 * Mermaid sizes the root with `width="100%"` and a `max-width` style, which
 * Typst's SVG loader cannot size. Pin width/height to the viewBox and drop
 * the style.
 */
function toStandaloneSvg(svg: string): string {
  const open = /<svg\b[^>]*>/.exec(svg)
  if (!open) throw new Error("Mermaid returned no <svg> root")
  const viewBox = /viewBox="([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)"/.exec(
    open[0]
  )
  if (!viewBox) throw new Error("Mermaid <svg> root has no viewBox")
  const width = Number(viewBox[3])
  const height = Number(viewBox[4])

  const root = open[0]
    .replace(/\swidth="[^"]*"/, "")
    .replace(/\sheight="[^"]*"/, "")
    .replace(/\sstyle="[^"]*"/, "")
    .replace("<svg", `<svg width="${width}" height="${height}"`)

  const body = svg.slice(open.index + open[0].length)
  if (/<foreignObject\b/.test(body)) {
    throw new Error(
      "Mermaid emitted foreignObject labels; Typst cannot render them"
    )
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${svg.slice(0, open.index)}${root}${body}`
}

/**
 * Mermaid escapes unknown HTML in SVG labels, so `<pre>..</pre>` would print
 * as literal text. Keep the text and drop the wrapper; the template's mono
 * font already carries the emphasis.
 */
function stripUnsupportedLabelTags(source: string): string {
  return source.replaceAll(/<\/pre>|<pre>/g, "")
}
