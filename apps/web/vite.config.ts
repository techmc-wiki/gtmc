import path from "node:path"

import { defineConfig } from "vite-plus"

// Lint and format settings live in the workspace root `vite.config.ts`.
export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
})
