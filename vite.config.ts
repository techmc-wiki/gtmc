import path from "node:path"
import { defineConfig } from "vite-plus"

export default defineConfig({
  check: {
    fmt: true,
    lint: true,
  },
  fmt: {
    bracketSameLine: true,
    printWidth: 80,
    semi: false,
    singleQuote: false,
    trailingComma: "es5",
    sortTailwindcss: {},
    sortPackageJson: false,
    ignorePatterns: [
      "node_modules",
      ".next",
      "build",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "articles",
      "public/baidu_verify_codeva-7UTEVaz1Ds.html",
      ".qa-*.ts",
      "*.qa-*.ts",
      "*.md",
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
      ".next/**",
      ".vercel/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".worktrees/**",
      ".agents/**",
      "articles/**",
      "**/*.cjs",
    ],
    plugins: [
      "typescript",
      "react",
      "nextjs",
      "react-perf",
      "jsx-a11y",
      "oxc",
      "eslint",
      "import",
      "unicorn",
    ],
    rules: {
      "eslint/arrow-body-style": "warn",
      "eslint/default-case-last": "warn",
      "no-control-regex": "off",
      "react-perf/jsx-no-new-function-as-prop": "off",
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
      "typescript/no-unused-vars": [
        "warn",
        {
          ignoreRestSiblings: true,
        },
      ],
    },
    settings: {
      next: {
        rootDir: ".",
      },
      react: {
        version: "19.2.7",
      },
    },
  },
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  staged: {
    "*.{ts,tsx,js,jsx,mjs}": "vp check --fix",
    "*.{json,css}": "vp fmt --write",
  },
})
