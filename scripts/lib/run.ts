import { spawnSync, type SpawnSyncOptions } from "node:child_process"

/**
 * Run a command with inherited stdio. Exits the process on non-zero status.
 * On Windows, uses shell so `.cmd` shims (pnpm, prisma, etc.) resolve correctly.
 */
export function run(
  command: string,
  args: string[] = [],
  options: SpawnSyncOptions = {}
): void {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  })

  if (result.error) {
    process.stderr.write(`Failed to run ${command}: ${result.error.message}\n`)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

/** Run a local TypeScript script via tsx (same as package.json generators). */
export function runScript(scriptPath: string, args: string[] = []): void {
  run("tsx", [scriptPath, ...args])
}
