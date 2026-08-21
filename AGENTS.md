# AGENTS.md

This file is the agent contract for the **GTMC website** repo. It complements `README.md` (human-facing) with the technical context, commands, and conventions an automated coding agent needs to make safe, useful changes.

> Agent-managed blocks at the bottom of this file (`<!-- gitnexus:* -->`, `<!-- BEGIN/END:nextjs-agent-rules -->`) are written by external tooling. **Do not hand-edit them.**

## Project Overview

This repo contains the public website for **Graduate Texts in Minecraft (GTMC)** — a community-driven online textbook on technical Minecraft. It serves articles (tutorials, mechanics explanations, source-code analyses) and a draft/review hub for contributors.

- **Framework**: Next.js 16 (App Router, Cache Components, Turbopack) on React 19
- **Language**: TypeScript 7.0.2 (strict mode)
- **Styling**: Tailwind CSS v4
- **Motion**: `motion` (Framer Motion successor)
- **Auth**: NextAuth v5 (GitHub provider) + Prisma adapter
- **Database**: Prisma 7 against Supabase Postgres
- **Content pipeline**: Markdown via remark/rehype, KaTeX math, Shiki code highlighting, gray-matter frontmatter
- **Editor**: CodeMirror 6 (markdown, autocomplete)
- **Schematics**: `schematic-renderer` + Three.js
- **Search**: MiniSearch
- **i18n**: `next-intl` with `en` and `zh` locales
- **Hosting**: Vercel (Speed Insights, Analytics, Blob)
- **Unified tooling**: pnpm 11 for package management, with Vite+ (`vp`) providing Oxlint, Oxfmt, and Vitest integration
- **Tests**: Vitest, Playwright, Lighthouse CI

The articles themselves live in a separate repo and are pulled in via a Git submodule at `articles/`, and the glossary CSV data is pulled in via a submodule at `glossary/`.

### Repository layout

```text
.
├── app/                    Next.js App Router (locale-scoped routes)
│   ├── [locale]/
│   │   ├── (public)/       Articles, public pages
│   │   ├── (private)/      Drafts, review hub, profile, admin
│   │   ├── (auth)/         GitHub sign-in flow
│   │   └── _homepage/      Hero card, foreground/background layers
│   └── api/                Route handlers
├── actions/                Server actions (drafts, reviews, profile, …)
├── components/ui/          tech-card, tech-button, corner-brackets, …
├── components/{articles,editor,glossary,layout,markdown,review,search,ui}/
├── lib/                    Article pipeline, auth, db, search, GitHub helpers
├── articles/               Article content (Git submodule)
├── glossary/               Glossary CSV data (Git submodule)
├── data/                   Generated manifest + article artifacts + PDF-ready HTML + glossary*.json + build caches
├── pdfgen/                 Go PDF renderer and post-processor
├── i18n/                   next-intl request config + routing
├── messages/               i18n catalogs (en.json, zh.json)
├── public/                 Static site assets (PDFs are published to R2)
├── scripts/                Manifest and content generators
├── proxy.ts                Auth + i18n middleware
├── schema.prisma           Database schema
└── DESIGN.md               Visual system reference
```

## Setup Commands

The project uses **pnpm v11** and runs on **Node 26** in CI. macOS, Linux, and Vercel build images are supported.

```bash
git clone https://github.com/techmc-wiki/gtmc.git
cd gtmc
vp install              # delegates to pinned pnpm; also runs postinstall
cp .env.example .env    # fill in GitHub OAuth, DATABASE_URL, etc.
pnpm dev                # http://localhost:3000
```

`pnpm install` triggers `scripts/postinstall.ts`, which:

1. Adds `.gitconfig` to the local Git config include path.
2. Initializes the `articles/` and `glossary/` submodules at their pinned commits if needed.
3. Generates the glossary manifest.
4. Runs `prisma generate` (with a placeholder `DATABASE_URL` if none is set, to allow client codegen offline), unless heavy postinstall steps are explicitly skipped.
5. Runs `tsx scripts/generate-article-manifest.ts`.
6. Runs `tsx scripts/generate-repository-contributor-stats.ts`; PDF rendering is handled separately by `pdfgen` in `.github/workflows/pdf.yml`.

CI notes for the Build workflow:

- Content artifacts are cached by articles SHA + glossary SHA + generator/lib hashes. Exact cache hits set `GTMC_SKIP_CONTENT_BUILD=true`.
- Install uses `GTMC_SKIP_POSTINSTALL=1`; Prisma is generated in a dedicated step. PDF rendering is not part of the site Build workflow.
- Superseded runs on the same ref are cancelled via `concurrency`.

### Environment variables

`.env.example` lists the required keys. None are committed.

| Variable                                                    | Purpose                                                                          |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`                                              | Pooled Postgres connection string (Supabase in production)                       |
| `DIRECT_URL`                                                | Direct Postgres connection used by Prisma migrations                             |
| `NEXT_PUBLIC_APP_URL`                                       | Public site origin used for canonical URLs and uploads                           |
| `GITHUB_ID` / `GITHUB_SECRET`                               | GitHub OAuth application credentials for sign-in                                 |
| `GITHUB_ARTICLES_READ_PAT`                                  | PAT used to read the articles repository                                         |
| `GITHUB_ARTICLES_WRITE_PAT`                                 | PAT used to write branches, assets, and pull requests in the articles repository |
| `GITHUB_ARTICLES_REPO_OWNER` / `GITHUB_ARTICLES_REPO_NAME`  | Target repo for article submission flows                                         |
| `GITHUB_GLOSSARY_REPO_OWNER` / `GITHUB_GLOSSARY_REPO_NAME`  | Upstream target repo for glossary (defaults to TechMC-Glossary/TechMC-Glossary)   |
| `GITHUB_GLOSSARY_FORK_REPO_OWNER` / `GITHUB_GLOSSARY_FORK_REPO_NAME` | Our fork repo receiving branches/commits before PR (defaults to techmc-wiki/glossary) |
| `GITHUB_GLOSSARY_FORK_WRITE_PAT`                            | PAT for opening glossary PRs (Contents write on fork + Pull requests write on upstream) |
| `BLOB_READ_WRITE_TOKEN`                                     | Vercel Blob token for uploads ≥ 4.5 MB                                           |
| `BLOB_STORE_HOSTNAME`                                       | Hostname of the Vercel Blob store                                                |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare R2 credentials used by the PDF publishing workflow                    |
| `R2_BUCKET_NAME`                                            | R2 bucket receiving `gtmc-en.pdf`, `gtmc-zh.pdf`, and build state                |
| `NEXT_PUBLIC_PDF_BASE_URL`                                  | Public R2 base URL used by the PDF download buttons                             |

NextAuth additionally expects `AUTH_SECRET` (or `NEXTAUTH_SECRET`) and the GitHub OAuth credentials used by `lib/auth/index.ts`.

## Development Workflow

```bash
pnpm dev                  # Start the Next.js dev server on :3000
vp check                  # Oxfmt check + Oxlint
vp check --fix            # Format and autofix lint findings
vp test run               # Run Vitest once
vp install                # Install with the pinned pnpm version
pnpm typecheck            # tsc --noEmit (strict, Next.js-aware)
pnpm check                # vp check + typecheck
pnpm build:content        # Generate content artifacts (manifest, glossary, articles, PDF HTML sidecars)
pnpm build:next           # Next.js production build only
pnpm build                # Both phases via scripts/build.ts
pnpm build:pdf            # Render data/pdf-dist/gtmc-en.pdf and gtmc-zh.pdf with pdfgen
pnpm prepare:articles     # Prepare articles submodule (GTMC_ARTICLES_SOURCE)
pnpm analyze              # next experimental-analyze
```

Key things to know:

- **Path alias**: `@/*` resolves to the repo root (see `tsconfig.json` and `vite.config.ts`).
- **Next.js command boundary**: continue using `pnpm dev` and `pnpm build`. The built-in `vp dev` and `vp build` commands invoke Vite and must not replace the Next.js/Turbopack scripts.
- **Middleware** lives in `proxy.ts` (not `middleware.ts`). It composes `next-intl` routing with NextAuth and gates `/admin`, `/draft`, `/glossary/edit`, `/profile`, and `/review` behind a session.
- **Local auth fixture**: `pnpm dev` seeds and injects the local admin `debug@gtmc.local` on localhost to exercise authenticated pages. Set `GTMC_DEV_FIXTURE_AUTH=0` to test the real sign-in flow; never rely on the fixture outside development.
- **Prisma client** is imported from `@prisma/client`; `serverExternalPackages` in `next.config.ts` keeps Prisma out of the client bundle.
- The build embeds a 7-char Git SHA as `NEXT_PUBLIC_BUILD_SHA` (falls back to `VERCEL_GIT_COMMIT_SHA`).

### Articles submodule

```bash
pnpm articles:status        # Show submodule status
pnpm articles:init          # Initialize/update to the pinned commit
pnpm articles:update        # Pull the latest articles commit on the tracked branch
pnpm prepare:articles       # Prepare articles for a build using GTMC_ARTICLES_SOURCE
pnpm generate:manifest      # Rebuild data/manifest.json
pnpm generate:content       # Re-render article content artifacts
pnpm build:pdf              # Rebuild PDFs from the generated HTML sidecars
```

Article build source is controlled by `GTMC_ARTICLES_SOURCE`:

- unset or blank: leave the current `articles/` checkout untouched; no `git submodule` command runs.
- `pinned`: run `git submodule update --init --recursive articles` to check out the commit pinned by this repo.
- `latest`: run `git submodule update --init --recursive --remote articles` before the content build, advancing to the branch configured in `.gitmodules` (currently `main`).

Vercel runs `pnpm build:vercel`, which sets `GTMC_ARTICLES_SOURCE=latest` before calling `pnpm prepare:articles`, so deployments consume the newest configured article branch. For reproducible local or CI builds, set `GTMC_ARTICLES_SOURCE=pinned`; leaving it unset preserves the checkout already prepared by `pnpm install`.

For reproducible releases, update and commit the submodule pointer here with `pnpm articles:update`. **Do not mix submodule pointer updates into feature/fix commits** (see `CONTRIBUTING.md`).

### Glossary submodule

```bash
pnpm glossary:status     # Show submodule status
pnpm glossary:init       # Initialize/update to the pinned commit
pnpm glossary:update     # Pull the latest glossary commit on the tracked branch
pnpm generate:glossary   # Rebuild data/glossary*.json
```

The glossary submodule works similarly to articles: Vercel uses the pinned commit, and updates require committing the new pointer. The generated `data/glossary*.json` files are used by the glossary page and search index.

## Testing Instructions

Test runners are installed but the standing rule is: **do not add or propose tests unless explicitly requested.** Tests are handled as isolated tasks. When the user asks for tests, use the commands below.

```bash
vp test run                                    # Run all tests once
vp test watch                                  # Watch mode
vp test run lib/articles/article-rebase.test.ts
vp test run -t "merges conflicting drafts"     # Filter by test name
```

- Vite+ config: `vite.config.ts` contains Vitest, Oxlint, Oxfmt, and staged-file settings.
- Existing specs live alongside the code in `lib/` (e.g. `lib/slug-utils.test.ts`, `lib/__tests__/article-loader.test.ts`, `lib/articles/*.test.ts`).
- Playwright is retained for browser-based checks; PDF rendering uses the Go `pdfgen` binary and Chromium provisioned by `.github/workflows/pdf.yml`.

When fixing a bug or changing existing logic, update the colocated specs to match — but do **not** introduce new test infrastructure or scaffolding without an explicit ask.

## Code Style

- **TypeScript**: `strict` is on. Never silence type errors with `as any`, `@ts-ignore`, or `@ts-expect-error`. Fix the underlying type instead.
- **Linter**: Vite+ runs Oxlint from the `lint` block in `vite.config.ts`. Configured plugins include `typescript`, `react`, and `nextjs`; generated output, agent support directories, and the articles submodule are ignored.
- **Formatter**: Vite+ runs Oxfmt from the `fmt` block in `vite.config.ts`, including Tailwind class sorting. Markdown and verification artifacts are excluded; leave Markdown formatting alone unless asked.
- **React**: React 19 with the new JSX transform — no need to import `React` in scope. `react/react-in-jsx-scope` is disabled.
- **File names**: kebab-case for modules and components (e.g. `tech-card.tsx`, `article-rebase.test.ts`).
- **Import paths**: prefer the `@/...` alias over long relative paths.
- **Server vs client**: keep server actions in `actions/`, route handlers in `app/api/`, and client components explicitly marked with `"use client"`.

## Visual System

> **All visual conventions live in @DESIGN.md.** Tokens, surfaces, components, motion, decorative motifs, navigation, and accessibility rules are documented there.

When working on UI:

- **Read @DESIGN.md first.** It is the single source of truth for the GTMC visual language.
- **Do not duplicate or restate** color tokens, typography, component APIs, or motion catalog in this file or anywhere else.
- **Do not invent ad-hoc styles** that conflict with the documented system. If a need is genuinely missing, raise it before adding new tokens or primitives.

## Build and Deployment

```bash
pnpm build:content  # Generate static content artifacts and PDF HTML sidecars
pnpm build:next     # Next.js production build only
pnpm build          # Both phases (scripts/build.ts); skip content with GTMC_SKIP_CONTENT_BUILD=true
pnpm build:vercel   # Vercel entrypoint (scripts/build-vercel.ts)
pnpm build:pdf      # Generate data/pdf-dist/gtmc-en.pdf and gtmc-zh.pdf with pdfgen
pnpm analyze        # next experimental-analyze
```

**Two-phase build model:**

- **Phase 1 (`build:content` → `scripts/build-content.ts`)**: Generates static site artifacts — `data/manifest.json`, `data/glossary*.json`, rendered article content, and PDF-ready HTML sidecars under `data/pdf-html/{locale}/`.
- **PDF publishing (`pnpm build:pdf`)**: Consumes those sidecars, uses the Go `pdfgen` binary plus Chromium, and writes `data/pdf-dist/gtmc-en.pdf` and `data/pdf-dist/gtmc-zh.pdf`. `.github/workflows/pdf.yml` runs this only when the Articles revision or PDF pipeline code changed, then uploads both PDFs to Cloudflare R2.
- **Phase 2 (`build:next`)**: Runs `next build`, consuming the artifacts from phase 1.
- **`pnpm build`**: Runs both phases in order (`scripts/build.ts`).

This is not a multi-package split or monorepo; it's a formalized build phase boundary within a single Next.js project. The content phase produces static artifacts that the Next.js build consumes.

Notes:

- `pnpm build` is **non-trivial** — phase 1 regenerates all content artifacts before phase 2 invokes `next build`. Allow time and disk space accordingly.
- `next.config.ts` enables Cache Components and configures `outputFileTracingIncludes` / `Excludes` so article, glossary, search, and litematica routes get the right files without pulling article binaries or PDFs into every lambda. Keep these patterns in sync if you add similar routes.
- Vercel uses `vercel.json` to install the site runtime libraries before `pnpm install`, then runs `pnpm build:vercel`. That script prepares the articles submodule according to `GTMC_ARTICLES_SOURCE`, deploys Prisma migrations, and runs the site content/Next.js build; PDF publishing is handled separately by `.github/workflows/pdf.yml`.
- CI workflows (`.github/workflows/`):
  - `build.yml` — runs the site build on every push and PR with Node 26; concurrency-cancels superseded runs on the same ref; restores content artifacts by articles+glossary SHA and generator hashes, installs with `GTMC_SKIP_POSTINSTALL=1`, generates Prisma, then runs `pnpm build` (Next typechecks during build; standalone `tsc` is omitted).
  - `pdf.yml` — runs on `dev` pushes, a six-hour schedule, or manual dispatch; compares the latest Articles `main` SHA and a hash of the PDF pipeline inputs, builds sidecars then `pdfgen`, provisions pinned Chromium, and uploads PDFs plus state to R2 only when either input changed.
  - `style_and_lint.yml` — runs on pushes to `main` with Node 26; skips heavy postinstall work, then runs the lint and format check scripts.
  - `submit_pr.yml` — `workflow_dispatch` only; opens automated article-submission PRs from the review hub.

Before reporting a build-affecting change as "done":

```bash
pnpm check && pnpm test
```

Run `pnpm build` locally for any change that touches `next.config.ts`, the article generators, or anything in `scripts/`.

## Pull Request Guidelines

### Commit format

Conventional Commits style:

```
<type>(<scope>): <subject>
```

- `<scope>` is optional when the area is too broad to be meaningful.
- `<subject>` is imperative and starts with a capital letter.
- **Hard limit: 72 characters total.**

Allowed `<type>` values:

| type       | meaning                                              |
| ---------- | ---------------------------------------------------- |
| `feat`     | new feature                                          |
| `fix`      | bug fix                                              |
| `refactor` | code restructure (no new feature, no bug fix)        |
| `docs`     | documentation only                                   |
| `style`    | formatting/style-only changes (no semantic changes)  |
| `chore`    | build / scripts / dependencies / general maintenance |
| `test`     | test-related work                                    |
| `perf`     | performance optimization                             |

Recent history frequently uses `fix(scope): …`, `feat(scope): …`, and `chore(scope): …`. Prefer including a scope (e.g. `sidebar`, `build`, `deps`, `api/*`) for traceability.

### Publishing GitHub releases

Release tags use the `vX.Y.Z` format and are published from the `dev` branch. Release versioning must follow semver standards. The target commit must already be present on the remote `dev` branch; agents must not push or pull, so stop for a user-managed push when the local branch is ahead. Before publishing, inspect the commits since the previous release and confirm the worktree is clean. Match the existing release-note style: use `Feature:`/`Features:` and optional `Dev:` headings, with a numbered list under each heading. Keep `Dev` selective: include only changes that affect the developer workflow, CI/CD, or release process, and omit internal refactors and implementation details.

Create and publish a release with the GitHub CLI so the tag is created on the target branch and the release is public:

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

### Splitting

- Each commit should be **single-purpose, easily reversible, and atomic**.
- **Do not** mix `articles` submodule pointer updates into feature/fix commits — submit them as their own `chore(articles): …` commit (see `CONTRIBUTING.md`).
- For large patches, split into multiple medium-sized, reversible commits.

### Required checks before requesting review

```bash
pnpm check
pnpm test
```

`pnpm build` will run in CI; run it locally if your change touches the build pipeline, generators, or `next.config.ts`.

### Git rules for agents

1. You **may** create commits when the task implies it.
2. You **must NOT** run `git push` or `git pull`.
3. **Do not** create new branches or worktrees unless explicitly asked.
4. Keep commits medium-sized and maximally reversible; split large patches.
5. If files or commit hashes change unexpectedly (e.g. mid-rebase), do not force-revert unrelated changes — surface the issue to the user.
6. Never use destructive Git operations (`reset --hard`, `clean -f`, force-push, branch deletion) without explicit instruction.

## Other Notes

1. Prefer the latest stable versions for newly added dependencies, unless there is a clear stability risk.
2. **Do not delete files** unless the task explicitly requires pruning, refactoring, or simplification.
3. `AGENTS.md`, `docs/superpowers/`, and `.sisyphus/` are agent-support assets — be mindful of their `.gitignore` status before committing.
4. If the current objective is fully done and the conversation context no longer helps, you may suggest opening a new session.
5. `node_modules/next/dist/docs/` is the source of truth for Next.js behaviour — read it before relying on training-data knowledge of Next.js APIs (see the auto-managed Next.js block below).
6. TypeScript 7 includes the native `tsgo` tool. This repo uses `next@16.3.0-canary.83`, which supports the TypeScript 7 toolchain; earlier pre-`canary.83` Next.js 16.3 versions do not. Keep using the existing `pnpm typecheck` script unless the Next.js typecheck integration is intentionally migrated to `tsgo`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
<!-- END:nextjs-agent-rules -->

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **gtmc** (5040 symbols, 10627 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "dev"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/gtmc/context` | Codebase overview, check index freshness |
| `gitnexus://repo/gtmc/clusters` | All functional areas |
| `gitnexus://repo/gtmc/processes` | All execution flows |
| `gitnexus://repo/gtmc/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
