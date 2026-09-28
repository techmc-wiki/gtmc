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
    // The pdfcn registry files are vendored as installed. Reformatting them
    // would bury the hand-written renderer in whitespace churn and make a
    // future registry bump impossible to read.
    ignorePatterns: [
      "node_modules",
      ".cache",
      "components/pdf",
      "lib",
      "types",
    ],
    trailingComma: "es5",
    sortPackageJson: false,
  },
})
