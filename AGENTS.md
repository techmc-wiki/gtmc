# AGENTS.md

Agent context for the **GTMC website**, the public site for Graduate Texts in Minecraft (reader surfaces, drafts workspace, GitHub PR integration).

The site is live at <https://www.techmc.wiki>. The infra was provided by Vercel and DNS by Cloudflare.

## Stack

- Next.js 16 (App Router, Turbopack) on React 19, TypeScript strict mode
- Tailwind CSS v4 (tokens in `DESIGN.md` / `app/globals.css`); shadcn/ui primitives in `components/ui/shadcn/`
- Prisma 7 (Postgres) + NextAuth v5 (GitHub provider); next-intl i18n
- Markdown pipeline (remark/rehype, KaTeX, Shiki) over the `content/articles` and `content/glossary` submodules
- pnpm 12 workspace, Vite+ (`vp` for Oxlint, Oxfmt, Vitest)
- Go 1.26 for `tools/pdfgen`, the headless-Chromium PDF renderer

## Layout

This is a pnpm workspace. The root holds only workspace-level concerns; the
site and the PDF renderer live in their own directories.

```text
apps/web/       The Next.js site (@gtmc/web) — everything below is relative to it
  app/          App Router (locale-scoped [locale] routes, api/)
  actions/      Server actions
  components/   UI components (primitives in components/ui/shadcn/)
  lib/          Article pipeline, auth, db, search, GitHub helpers
  hooks/        Shared React hooks
  i18n/         next-intl config; catalogs in messages/ (en.json, zh.json)
  types/        Ambient type declarations
  content/      Static content (about, authors, pdf)
  data/         Generated manifests, search indices, build caches (gitignored)
  scripts/      Manifest, content, and PDF generators
  proxy.ts      Auth + i18n middleware
tools/pdfgen/   Go PDF renderer (CLI; not a pnpm package)
  html/ fonts/ work/ dist/   Generated PDF inputs, render scratch, and output (gitignored)
packages/ssg/   Article generation and shared Markdown transforms (@gtmc/ssg)
content/         Content submodules
  articles/      Article content submodule
  glossary/      Glossary data submodule
```

`content/articles` and `content/glossary` are git submodules pinned at the
workspace root, not under `apps/web`. Code that needs them must go through
`lib/workspace-paths.ts` (`getWorkspaceRoot()` / `workspacePath(...)`) rather
than `process.cwd()`, which is only correct when a process happens to have
been started from `apps/web`.

## Setup

```bash
vp install              # Install dependencies with pinned pnpm + run postinstall
cp apps/web/.env.example apps/web/.env   # All environment variables are documented there
pnpm dev                # Start development server at http://localhost:3000
```

## Commands

```bash
pnpm check                       # vp check (oxfmt + oxlint) + tsc --noEmit
pnpm typecheck                   # tsc --noEmit only
pnpm test                        # All Vitest suites (vp test run)

# `vp` resolves its config from apps/web/vite.config.ts, so run it from there:
cd apps/web
vp check --fix                   # Auto-format and autofix lint findings
vp test run <file-path>          # Run a specific test file
vp test run -t "<test-name>"     # Filter by test name
cd ../..

pnpm build                       # Full build: content generation + next build
pnpm build:content               # Phase 1: static content and manifest generation
pnpm build:next                  # Phase 2: Next.js production build
pnpm generate:manifest           # Rebuild apps/web/data/manifest.json
pnpm generate:content            # Re-render article content artifacts
pnpm generate:glossary           # Rebuild apps/web/data/glossary*.json
pnpm generate:pdf-html            # Render article artifacts to tools/pdfgen/html
pnpm build:pdf                    # Build tools/pdfgen/dist/gtmc-{en,zh}.pdf
pnpm articles:update             # Pull latest articles submodule commit
pnpm glossary:update             # Pull latest glossary submodule commit
```

Before declaring any build-affecting change complete, run `pnpm check && pnpm test`.

## Testing

**Standing policy**: Do not add or propose tests unless explicitly requested.

## Code Style

- Never bypass types with `as any`, `@ts-ignore`, or `@ts-expect-error`; fix root types.
- Use existing shadcn/ui components from `components/ui/shadcn/` before creating custom primitives. Follow `DESIGN.md` for styling, tokens, and geometry.
- Imports use the `@/*` path alias, which resolves to `apps/web` (the app root, not the repository root). Server actions in `actions/`; route handlers in `app/api/`; middleware in `proxy.ts` (not `middleware.ts`).
- Monospace + uppercase + wide tracking is strictly for apparatus controls (buttons, badges, tabs, nav). Standard form labels, empty states, and dialog titles use normal sans capitalization.

## Pull Request & Git Guidelines

- Conventional Commits (`<type>(<scope>): <subject>`, max 72 chars; types: `feat`, `fix`, `refactor`, `docs`, `style`, `chore`, `test`, `perf`).
- Never mix submodule pointer updates (`content/articles`, `content/glossary`) with feature or bugfix commits; commit them separately as `chore(articles): ...`.
- Atomic, reversible commits are fine. **Never** run `git push` or `git pull`. **Never** use destructive Git commands (`reset --hard`, `clean -f`, force push) without explicit instruction.

### Publishing GitHub releases

Release tags use the `vX.Y.Z` format (semver) and are published from the `dev` branch. The target commit must already be present on the remote `dev` branch; agents must not push or pull, so stop for a user-managed push when the local branch is ahead. Before publishing, inspect the commits since the previous release, pick the next version (`feat` → minor, `fix`/`perf` → patch, breaking → major), and confirm the worktree is clean.

1. Bump `version` in `apps/web/package.json` to the new version (bare semver, no `v` prefix) in its own commit. A bump never touches `pnpm-lock.yaml`, so stage the manifest alone and never regenerate dependencies for it. `release.yml` reads this file; the workspace root `package.json` mirrors the version but is not the gate.

   ```bash
   git add apps/web/package.json
   git commit -m "chore: bump package version to vX.Y.Z"
   ```

2. Tag that same commit and push the tag. `-m ""` makes an empty-message annotated tag (signed, per `tag.gpgSign`) without opening an editor.

   ```bash
   git tag -m "" vX.Y.Z
   git push origin vX.Y.Z
   ```

3. Once the release appears on GitHub (initialized by CI with `[Graduate Texts in Minecraft](https://www.techmc.wiki)`), edit it to match the existing style: always preserve the leading website link, followed by `Features:` and optional `Dev:` headings with numbered lists under each. Never overwrite or omit the leading `[Graduate Texts in Minecraft](https://www.techmc.wiki)` link when rewriting or updating notes. Keep `Dev` selective: developer workflow, CI/CD, or release process only.

   ```bash
   gh release edit vX.Y.Z \
     --repo techmc-wiki/gtmc \
     --notes $'[Graduate Texts in Minecraft](https://www.techmc.wiki)\n\nFeatures:\n\n1. Describe the user-facing change\n\nDev:\n\n1. Describe the developer-facing change'
   ```

Tags are never re-pointed at an already-published release. Verify the release is neither a draft nor a prerelease and that it appears in `gh release list` after publishing.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
