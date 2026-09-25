import { spawn, spawnSync, type SpawnSyncOptions } from "node:child_process"

import { createLogger } from "./logger"

const logger = createLogger("command")

// Package-manager CLIs expose `.cmd` shims on Windows, so direct spawns need shell resolution.
const defaultShell = process.platform === "win32"

export function run(
  command: string,
  args: string[] = [],
  options: SpawnSyncOptions = {}
): void {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: defaultShell,
    ...options,
  })

  if (result.error) {
    logger.error("command.failed", { command }, result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    logger.error("command.failed", {
      command,
      exit_code: result.status ?? 1,
    })
    process.exit(result.status ?? 1)
  }
}

export function runScript(scriptPath: string, args: string[] = []): void {
  run("tsx", [scriptPath, ...args])
}

export function runScriptAsync(
  scriptPath: string,
  args: string[] = []
): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>()
  const child = spawn("tsx", [scriptPath, ...args], {
    stdio: "inherit",
    shell: defaultShell,
  })
  child.on("error", (error) => {
    logger.error("command.failed", { command: "tsx" }, error.message)
    reject(error)
  })
  child.on("exit", (code) => {
    if (code === 0) {
      resolve()
    } else {
      const error = new Error(`Command failed with exit code ${code ?? 1}`)
      logger.error("command.failed", { command: "tsx", exit_code: code ?? 1 })
      reject(error)
    }
  })
  return promise
}
