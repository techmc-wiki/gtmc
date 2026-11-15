import { defineConfig } from "vite-plus"

export default defineConfig({
  fmt: {
    bracketSameLine: true,
    semi: false,
    singleQuote: false,
    sortImports: true,
    sortTailwindcss: true,
    printWidth: 100,
    ignorePatterns: [
      ".next",
      "*.md",
      "build",
      "content/articles",
      "content/glossary",
      "content/properties",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "apps/web/public/baidu_verify_codeva-7UTEVaz1Ds.html",
    ],
  },
  lint: {
    categories: {
      correctness: "error",
      perf: "warn",
      suspicious: "warn",
    },
    env: {
      browser: true,
      builtin: true,
      es2024: true,
      node: true,
    },
    ignorePatterns: [
      ".next",
      ".vercel",
      "build",
      "content/articles",
      "content/glossary",
      "content/properties",
      "next-env.d.ts",
      ".agents/**",
    ],
    plugins: [
      "eslint",
      "import",
      "jsx-a11y",
      "nextjs",
      "oxc",
      "react-perf",
      "react",
      "typescript",
      "unicorn",
    ],
    rules: {
      // Fires on intentionally sequential work: shared CDP browser, shared
      // caches, and the bounded-concurrency pool in lib/pdf/fonts.ts.
      "eslint/arrow-body-style": "warn",
      "eslint/default-case-last": "warn",
      "eslint/no-await-in-loop": "off",
      "import/no-duplicates": "warn",
      // Flags effect-local cancellation flags and rAF ids, which are the
      // documented React idiom; its suggested fix (use state) would re-render.
      "react/immutability": "off",
      "react-perf/jsx-no-jsx-as-prop": "off",
      "react-perf/jsx-no-new-array-as-prop": "off",
      "react-perf/jsx-no-new-function-as-prop": "off",
      "react-perf/jsx-no-new-object-as-prop": "off",
      "react/jsx-boolean-value": "warn",
      "react/jsx-curly-brace-presence": "warn",
      "react/jsx-fragments": "warn",
      "react/react-in-jsx-scope": "off",
      "typescript/ban-ts-comment": "warn",
      "typescript/consistent-type-imports": "warn",
      "unicorn/catch-error-name": "warn",
      "unicorn/consistent-date-clone": "warn",
      "unicorn/empty-brace-spaces": "warn",
      "unicorn/prefer-spread": "warn",
      "unicorn/prefer-string-replace-all": "warn",
      "eslint/curly": ["warn", "multi-line"],
      "eslint/eqeqeq": ["warn", "smart", { null: "ignore" }],
      "typescript/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
    },
    settings: {
      next: {
        rootDir: "apps/web",
      },
      react: {
        version: "19.2.7",
      },
    },
  },
  staged: {
    "*.{ts,tsx,js,jsx,mjs}": "vp check --fix",
    "*.{json,css}": "vp fmt --write",
  },
})
