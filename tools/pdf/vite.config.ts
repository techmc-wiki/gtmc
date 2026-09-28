import { defineConfig } from "vite-plus"

/**
 * Mirrors the formatting the site uses in `apps/web/vite.config.ts`, so the
 * renderer reads as the same codebase even though it builds separately.
 */
export default defineConfig({
  fmt: {
    bracketSameLine: true,
    printWidth: 80,
    semi: false,
    singleQuote: false,
    trailingComma: "es5",
    sortPackageJson: false,
    ignorePatterns: ["node_modules", ".cache"],
  },
})
