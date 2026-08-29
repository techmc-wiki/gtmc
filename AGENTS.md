# AGENTS.md

Agent context for the **GTMC website** — public site for Graduate Texts in Minecraft (reader surfaces, drafts workspace, GitHub PR integration).

The site is live at <https://www.techmc.wiki>. The infra was provided by Vercel and DNS by Cloudflare.

## Stack

- Next.js 16 (App Router, Turbopack) on React 19, TypeScript strict mode
- Tailwind CSS v4 (tokens in `DESIGN.md` / `app/globals.css`); shadcn/ui primitives in `components/ui/shadcn/`
- Prisma 7 (Postgres) + NextAuth v5 (GitHub provider); next-intl i18n
- Markdown pipeline (remark/rehype, KaTeX, Shiki) over the `articles/` and `glossary/` submodules
- pnpm 12, Vite+ (`vp` for Oxlint, Oxfmt, Vitest)

## Layout

```text
app/          App Router (locale-scoped [locale] routes, api/)
actions/      Server actions
components/   UI components (primitives in components/ui/shadcn/)
lib/          Article pipeline, auth, db, search, GitHub helpers
hooks/        Shared React hooks
i18n/         next-intl config; catalogs in messages/ (en.json, zh.json)
types/        Ambient type declarations
content/      Static content (about, authors, pdf)
articles/     Article content submodule
glossary/     Glossary data submodule
data/         Generated manifests, search indices, build caches
scripts/      Manifest, content, and PDF generators (pdfgen/ is the Go PDF renderer)
proxy.ts      Auth + i18n middleware
```

## Setup

```bash
vp install              # Install dependencies with pinned pnpm + run postinstall
cp .env.example .env    # All environment variables are documented there
pnpm dev                # Start development server at http://localhost:3000
```

## Commands

```bash
pnpm check                       # vp check (oxfmt + oxlint) + tsc --noEmit
pnpm typecheck                   # tsc --noEmit only
vp check --fix                   # Auto-format and autofix lint findings
pnpm test                        # All Vitest suites (vp test run)
vp test run <file-path>          # Run a specific test file
vp test run -t "<test-name>"     # Filter by test name

pnpm build                       # Full build: content generation + next build
pnpm build:content               # Phase 1: static content and manifest generation
pnpm build:next                  # Phase 2: Next.js production build
pnpm generate:manifest           # Rebuild data/manifest.json
pnpm generate:content            # Re-render article content artifacts
pnpm generate:glossary           # Rebuild data/glossary*.json
pnpm articles:update             # Pull latest articles submodule commit
pnpm glossary:update             # Pull latest glossary submodule commit
```

Before declaring any build-affecting change complete, run `pnpm check && pnpm test`.

## Testing

**Standing policy**: Do not add or propose tests unless explicitly requested.

## Code Style

- Never bypass types with `as any`, `@ts-ignore`, or `@ts-expect-error`; fix root types.
- Use existing shadcn/ui components from `components/ui/shadcn/` before creating custom primitives. Follow `DESIGN.md` for styling, tokens, and geometry.
- Imports use the `@/*` path alias (repository root). Server actions in `actions/`; route handlers in `app/api/`; middleware in `proxy.ts` (not `middleware.ts`).
- Monospace + uppercase + wide tracking is strictly for apparatus controls (buttons, badges, tabs, nav). Standard form labels, empty states, and dialog titles use normal sans capitalization.

## Pull Request & Git Guidelines

- Conventional Commits (`<type>(<scope>): <subject>`, max 72 chars; types: `feat`, `fix`, `refactor`, `docs`, `style`, `chore`, `test`, `perf`).
- Never mix submodule pointer updates (`articles/`, `glossary/`) with feature or bugfix commits; commit them separately as `chore(articles): ...`.
- Atomic, reversible commits are fine. **Never** run `git push` or `git pull`. **Never** use destructive Git commands (`reset --hard`, `clean -f`, force push) without explicit instruction.

### Publishing GitHub releases

Release tags use the `vX.Y.Z` format (semver) and are published from the `dev` branch. The target commit must already be present on the remote `dev` branch; agents must not push or pull, so stop for a user-managed push when the local branch is ahead. Before publishing, inspect the commits since the previous release and confirm the worktree is clean. Match the existing release-note style: `Features:` and optional `Dev:` headings, numbered lists under each. Keep `Dev` selective: developer workflow, CI/CD, or release process only.

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
