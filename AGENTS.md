# AGENTS.md

This file provides coding agents with technical context, commands, and conventions for the **GTMC website** repository.

> Agent-managed blocks at the bottom (`<!-- BEGIN/END:nextjs-agent-rules -->`) are maintained by tooling. Do not edit them.

## Project Overview

Public website for **Graduate Texts in Minecraft (GTMC)** — a community textbook on technical Minecraft with reader surfaces, drafts workspace, and GitHub PR integration.

- **Framework**: Next.js 16 (App Router, Turbopack) on React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 (design tokens defined in `DESIGN.md` / `app/globals.css`)
- **UI Primitives**: shadcn/ui in `components/ui/shadcn/`
- **Database & Auth**: Prisma 7 (Postgres) + NextAuth v5 (GitHub provider)
- **Content Pipeline**: Markdown (remark/rehype, KaTeX, Shiki) via submodules (`articles/`, `glossary/`)
- **Tooling**: pnpm 11, Vite+ (`vp` for Oxlint, Oxfmt, Vitest)

### Directory Layout

```text
├── app/                    App Router (locale-scoped [locale] routes, api/)
├── actions/                Server actions
├── components/             UI components (components/ui/shadcn/ for primitives)
├── lib/                    Article pipeline, auth, db, search, GitHub helpers
├── articles/               Article content submodule
├── glossary/               Glossary data submodule
├── data/                   Generated manifests, search indices, and build caches
├── messages/               i18n catalogs (en.json, zh.json)
├── scripts/                Manifest, content, and PDF generators
├── proxy.ts                Auth + i18n middleware
└── DESIGN.md               Visual design system reference
```

## Setup & Commands

```bash
vp install              # Install dependencies with pinned pnpm + run postinstall
cp .env.example .env    # Configure local environment variables
pnpm dev                # Start development server at http://localhost:3000
```

Environment variables are listed in `.env.example`. Key variables:

- `DATABASE_URL` / `DIRECT_URL`: Postgres connection strings (Supabase).
- `GITHUB_ID` / `GITHUB_SECRET` / `AUTH_SECRET`: NextAuth authentication.
- `GITHUB_ARTICLES_*` / `GITHUB_GLOSSARY_*`: GitHub PATs and repository targets.

## Common Workflows

### Quality & Type Checking

```bash
pnpm check              # Run oxfmt + oxlint (vp check) and tsc --noEmit
vp check --fix          # Auto-format and autofix lint findings
pnpm typecheck          # Run tsc --noEmit only
```

### Content & Submodule Generation

```bash
pnpm generate:manifest  # Rebuild data/manifest.json
pnpm generate:content   # Re-render article content artifacts
pnpm generate:glossary  # Rebuild data/glossary*.json
pnpm articles:update    # Pull latest articles submodule commit
pnpm glossary:update    # Pull latest glossary submodule commit
```

### Build & Verification

```bash
pnpm build              # Full build: content generation + next build
pnpm build:content      # Phase 1: Static content and manifest generation
pnpm build:next         # Phase 2: Next.js production build
```

Before declaring any build-affecting change complete, run:

```bash
pnpm check && pnpm test
```

## Testing Instructions

**Standing policy**: Do not add or propose tests unless explicitly requested.

When running existing tests:

```bash
pnpm test                               # Run all Vitest suites (vp test run)
vp test run <file-path>                 # Run a specific test file
vp test run -t "<test-name>"            # Filter by test name
```

## Code Style & Conventions

- **TypeScript**: Strict mode enabled. Never bypass types with `as any`, `@ts-ignore`, or `@ts-expect-error`. Fix root types.
- **UI Primitives**: Always use existing shadcn/ui components from `components/ui/shadcn/` (Button, Card, Input, Dialog, etc.) before creating custom primitives. Follow `@DESIGN.md` for styling, tokens, and geometry.
- **Imports**: Use the `@/*` path alias resolving to the repository root.
- **Server vs Client**:
  - Server actions belong in `actions/`.
  - Route handlers belong in `app/api/`.
  - Client components must declare `"use client"`.
  - Middleware lives in `proxy.ts` (not `middleware.ts`).
- **Typography & Labels**: Monospace + uppercase + wide tracking is strictly for apparatus controls (buttons, badges, tabs, nav). Standard form labels, empty states, and dialog titles use normal sans capitalization.

## Pull Request & Git Guidelines

- **Commit Format**: Conventional Commits style (`<type>(<scope>): <subject>`), max 72 characters:
  - Allowed types: `feat`, `fix`, `refactor`, `docs`, `style`, `chore`, `test`, `perf`.
- **Submodules**: Never mix submodule pointer updates (`articles/`, `glossary/`) with feature or bugfix commits. Commit them separately as `chore(articles): ...`.
- **Agent Safety**:
  - You may create atomic, reversible commits.
  - **Never** run `git push` or `git pull`.
  - **Never** use destructive Git commands (`reset --hard`, `clean -f`, force push) without explicit instruction.

### Publishing GitHub releases

Release tags use the `vX.Y.Z` format and are published from the `dev` branch. Release versioning must follow semver standards. The target commit must already be present on the remote `dev` branch; agents must not push or pull, so stop for a user-managed push when the local branch is ahead. Before publishing, inspect the commits since the previous release and confirm the worktree is clean. Match the existing release-note style: use `Feature:`/`Features:` and optional `Dev:` headings, with a numbered list under each heading. Keep `Dev` selective: include only changes that affect the developer workflow, CI/CD, or release process, and omit internal refactors and implementation details.

```bash
gh auth status
gh release create vX.Y.Z \
  --repo techmc-wiki/gtmc \
  --target dev \
  --title vX.Y.Z \
  --notes $'Features:\n\n1. Describe the user-facing change\n\nDev:\n\n1. Describe the developer-facing change'
gh release view vX.Y.Z --repo techmc-wiki/gtmc
```

Use `--verify-tag` only when the tag already exists remotely. Verify the release is neither a draft nor a prerelease and that it appears in `gh release list` after publishing.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
