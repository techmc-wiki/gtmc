/**
 * Content-generation phase of the production build.
 *
 * Order matters: manifest feeds author profiles and rendered content;
 * glossary is independent but lives in the same artifact phase; PDF
 * needs rendered content + manifest.
 *
 * Usage: pnpm build:content
 */
import { runScript } from "./lib/run"

const steps: Array<{ label: string; script: string; args?: string[] }> = [
  { label: "Article manifest", script: "scripts/generate-article-manifest.ts" },
  {
    label: "Author profiles",
    script: "scripts/generate-author-profiles.ts",
  },
  {
    label: "Glossary manifest",
    script: "scripts/generate-glossary-manifest.ts",
  },
  {
    label: "Rendered article content",
    script: "scripts/generate-article-content.ts",
  },
  {
    label: "Offline PDFs",
    script: "scripts/generate-pdf.ts",
    args: ["--locale", "all"],
  },
]

for (const step of steps) {
  process.stdout.write(`\n→ ${step.label}\n`)
  runScript(step.script, step.args ?? [])
}

process.stdout.write("\nContent build complete.\n")
