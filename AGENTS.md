# AGENTS.md

This file is the agent contract for the **GTMC website** repo. It complements `README.md` (human-facing) with the technical context, commands, and conventions an automated coding agent needs to make safe, useful changes.

> Agent-managed blocks at the bottom of this file (`<!-- gitnexus:* -->`, `<!-- BEGIN/END:nextjs-agent-rules -->`) are written by external tooling. **Do not hand-edit them.**

## Project Overview

`gtmc-web` is the public website for **Graduate Texts in Minecraft (GTMC)** — a community-driven online textbook on technical Minecraft. It serves articles (tutorials, mechanics explanations, source-code analyses), a draft/review hub for contributors, and a feature-request tracker.

- **Framework**: Next.js 16 (App Router, Cache Components, Turbopack) on React 19
- **Language**: TypeScript 6 (strict mode)
- **Styling**: Tailwind CSS v4
- **Motion**: `motion` (Framer Motion successor)
- **Auth**: NextAuth v5 (GitHub provider) + Prisma adapter
- **Database**: Prisma 7 against Supabase Postgres
- **Content pipeline**: Markdown via remark/rehype, KaTeX math, Shiki code highlighting, gray-matter frontmatter
- **Editor**: CodeMirror 6 (markdown, autocomplete, merge view)
- **Schematics**: `schematic-renderer` + Three.js
- **Search**: MiniSearch
- **i18n**: `next-intl` with `en` and `zh` locales
- **Hosting**: Vercel (Speed Insights, Analytics, Blob)
- **Lint / Format**: oxlint (not ESLint), Prettier with Tailwind plugin
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
├── components/{articles,editor,features,layout,markdown,review,search}/
├── lib/                    Article pipeline, auth, db, search, GitHub helpers
├── articles/               Article content (Git submodule)
├── glossary/               Glossary CSV data (Git submodule)
├── data/                   Generated manifest + rendered article content + glossary*.json
├── i18n/                   next-intl request config + routing
├── messages/               i18n catalogs (en.json, zh.json)
├── public/                 Static assets including generated gtmc.pdf
├── scripts/                Manifest, content, and PDF generators
├── proxy.ts                Auth + i18n middleware
├── schema.prisma           Database schema
└── DESIGN.md               Visual system reference
```

## Setup Commands

The project uses **pnpm 11** (pinned via `packageManager` in `package.json`) and is tested on **Node 24** in CI. macOS, Linux, and Vercel build images are supported.

```bash
git clone https://github.com/gtmc-dev/gtmc.git
cd gtmc
pnpm install            # also runs scripts/postinstall.mjs (see below)
cp .env.example .env    # fill in GitHub OAuth, DATABASE_URL, etc.
pnpm dev                # http://localhost:3000
```

`pnpm install` triggers `scripts/postinstall.mjs`, which:

1. Adds `.gitconfig` to the local Git config include path.
2. Initializes the `articles/` submodule if it is missing or empty (otherwise leaves the existing checkout alone).
3. Runs `prisma generate` (with a placeholder `DATABASE_URL` if none is set, to allow client codegen offline).
4. Runs `tsx scripts/generate-article-manifest.ts` to seed `data/manifest.json`.
5. Runs `playwright install chromium` for the PDF generator and any browser tests.

### Environment variables

`.env.example` lists the required keys. None are committed.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Supabase in production) |
| `GITHUB_FEATURES_ISSUES_PAT` | PAT used to read/comment on feature issues |
| `GITHUB_FEATURES_WRITE_PAT` | PAT used to open/edit feature issues |
| `GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME` | Target repo for article submission flows |
| `GITHUB_GLOSSARY_REPO_OWNER` / `GITHUB_GLOSSARY_REPO_NAME` | Target repo for glossary submodule (defaults to TechMC-Glossary/TechMC-Glossary) |
| `GITHUB_GLOSSARY_WRITE_PAT` | PAT for opening glossary PRs (requires Contents + Pull requests read/write) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for uploads ≥ 4.5 MB |
| `BLOB_STORE_HOSTNAME` | Hostname of the Vercel Blob store |

NextAuth additionally expects `AUTH_SECRET` and GitHub OAuth credentials configured per `lib/auth.ts`.

## Development Workflow

```bash
pnpm dev                  # Start the Next.js dev server on :3000
pnpm typecheck            # tsc --noEmit (strict)
pnpm lint                 # oxlint (alias of lint:check)
pnpm lint:fix             # oxlint --fix
pnpm style                # prettier --check (alias of style:check)
pnpm style:fix            # prettier --write
pnpm build:content        # Generate content artifacts (manifest, glossary, articles, PDF)
pnpm build:next           # Next.js production build
pnpm build                # Both phases: content generation then Next build
pnpm analyze              # ANALYZE=true pnpm build (bundle analyzer)
pnpm lighthouse           # Run Lighthouse CI locally (requires running server)
```

Key things to know:

- **Path alias**: `@/*` resolves to the repo root (see `tsconfig.json` and `vitest.config.ts`).
- **Middleware** lives in `proxy.ts` (not `middleware.ts`). It composes `next-intl` routing with NextAuth and gates `/admin`, `/draft`, `/profile`, `/review`, and `/features/new` behind a session.
- **Prisma client** is imported from `@prisma/client`; `serverExternalPackages` in `next.config.ts` keeps Prisma out of the client bundle.
- The build embeds a 7-char Git SHA as `NEXT_PUBLIC_BUILD_SHA` (falls back to `VERCEL_GIT_COMMIT_SHA`).

### Articles submodule

```bash
pnpm articles:status        # Show submodule status
pnpm articles:init          # Reinitialize at the pinned commit
pnpm articles:update        # Pull the latest articles commit
pnpm generate:manifest      # Rebuild data/manifest.json
pnpm generate:content       # Re-render rendered article content
pnpm articles:pdf           # Re-render the offline PDF (public/gtmc.pdf)
```

Vercel checkouts use whatever commit is pinned by this repo; to ship updated article content, commit the new submodule pointer here. **Do not mix submodule pointer updates into feature/fix commits** (see `CONTRIBUTING.md`).

### Glossary submodule

```bash
pnpm glossary:status            # Show submodule status
pnpm glossary:init              # Reinitialize at the pinned commit
pnpm glossary:update            # Pull the latest glossary commit
pnpm generate:glossary-manifest # Rebuild data/glossary*.json
```

The glossary submodule works similarly to articles: Vercel uses the pinned commit, and updates require committing the new pointer. The generated `data/glossary*.json` files are used by the glossary page and search index.

## Testing Instructions

Test runners are installed but the standing rule is: **do not add or propose tests unless explicitly requested.** Tests are handled as isolated tasks. When the user asks for tests, use the commands below.

```bash
# Vitest is configured (vitest.config.ts) but no `pnpm test` script exists.
# Invoke it directly:
pnpm vitest run                                    # Run all tests once
pnpm vitest                                        # Watch mode
pnpm vitest run lib/articles/article-rebase.test.ts
pnpm vitest run -t "merges conflicting drafts"     # Filter by test name
```

- Vitest config: `vitest.config.ts` (globals enabled, `@/*` alias resolves to the repo root).
- Existing specs live alongside the code in `lib/` (e.g. `lib/slug-utils.test.ts`, `lib/__tests__/article-loader.test.ts`, `lib/articles/*.test.ts`).
- Playwright is installed for the PDF generator (`scripts/generate-pdf.ts`) and for any future e2e work; install browsers with `pnpm exec playwright install chromium` if missing.
- Lighthouse CI: `pnpm lighthouse` runs `lhci autorun` against `/`, `/features`, `/articles` (config in `.lighthouserc.js`). Requires a running dev or preview server.

When fixing a bug or changing existing logic, update the colocated specs to match — but do **not** introduce new test infrastructure or scaffolding without an explicit ask.

## Code Style

- **TypeScript**: `strict` is on. Never silence type errors with `as any`, `@ts-ignore`, or `@ts-expect-error`. Fix the underlying type instead.
- **Linter**: oxlint (`.oxlintrc.json`). Configured plugins: `typescript`, `react`, `nextjs`. `correctness` is `error`; `suspicious` is `off`. Ignored paths include `.next/`, `articles/`, `.sisyphus/`, `.agents/`, `.claude/`.
- **Formatter**: Prettier (`.prettierrc.json`) — `printWidth: 80`, `semi: false`, `singleQuote: false`, `trailingComma: "es5"`, `bracketSameLine: true`, with `prettier-plugin-tailwindcss` to auto-sort class lists. **Markdown is excluded** from Prettier (`.prettierignore`); leave Markdown formatting alone unless asked.
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
pnpm build:content  # Generate static content artifacts (manifest, glossary, articles, PDF)
pnpm build:next     # Next.js production build
pnpm build          # Both phases in order: build:content && build:next
pnpm analyze        # Same build with @next/bundle-analyzer enabled
```

**Two-phase build model:**

- **Phase 1 (`build:content`)**: Generates static content artifacts — `data/manifest.json`, `data/glossary*.json`, rendered article content, and `public/gtmc.pdf` (via Playwright + Chromium).
- **Phase 2 (`build:next`)**: Runs `next build`, consuming the artifacts from phase 1.
- **`pnpm build`**: Runs both phases in order.

This is not a multi-package split or monorepo; it's a formalized build phase boundary within a single Next.js project. The content phase produces static artifacts that the Next.js build consumes.

Notes:

- `pnpm build` is **non-trivial** — phase 1 regenerates all content artifacts before phase 2 invokes `next build`. Allow time and disk space accordingly.
- `next.config.ts` configures `outputFileTracingIncludes` / `Excludes` so search and litematica endpoints get the right files but article binaries are not pulled into every lambda. Keep these patterns in sync if you add similar routes. (Future: glossary manifests may need similar treatment if served from dedicated API routes.)
- Vercel uses `vercel.json` to install Chromium system libraries on Amazon Linux before `pnpm install`, then runs `pnpm build` exactly as above.
- CI workflows (`.github/workflows/`):
  - `build.yml` — runs on every push and PR; installs deps with `--frozen-lockfile`, generates the Prisma client with a placeholder `DATABASE_URL`, then runs `pnpm typecheck` and `pnpm build`.
  - `style_and_lint.yml` — runs on pushes to `main`; runs `pnpm lint:check` and `pnpm style:check`.
  - `submit_pr.yml` — `workflow_dispatch` only; opens automated article-submission PRs from the review hub.

Before reporting a build-affecting change as "done":

```bash
pnpm typecheck && pnpm lint:check && pnpm style:check
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

| type | meaning |
| --- | --- |
| `feat` | new feature |
| `fix` | bug fix |
| `refactor` | code restructure (no new feature, no bug fix) |
| `docs` | documentation only |
| `style` | formatting/style-only changes (no semantic changes) |
| `chore` | build / scripts / dependencies / general maintenance |
| `test` | test-related work |
| `perf` | performance optimization |

Recent history frequently uses `fix(scope): …`, `feat(scope): …`, and `chore(scope): …`. Prefer including a scope (e.g. `sidebar`, `build`, `deps`, `api/*`) for traceability.

### Splitting

- Each commit should be **single-purpose, easily reversible, and atomic**.
- **Do not** mix `articles` submodule pointer updates into feature/fix commits — submit them as their own `chore(articles): …` commit (see `CONTRIBUTING.md`).
- For large patches, split into multiple medium-sized, reversible commits.

### Required checks before requesting review

```bash
pnpm typecheck
pnpm lint:check
pnpm style:check
```

`pnpm build` will run in CI; run it locally if your change touches the build pipeline, generators, or `next.config.ts`.

### Git rules for agents

1. You **may** create commits when the task implies it.
2. You **must NOT** run `git push` or `git pull`.
3. **Do not** create new branches or worktrees unless explicitly asked.
4. Keep commits medium-sized and maximally reversible; split large patches.
5. If files or commit hashes change unexpectedly (e.g. mid-rebase), do not force-revert unrelated changes — surface the issue to the user.
6. Never use destructive Git operations (`reset --hard`, `clean -f`, force-push, branch deletion) without explicit instruction.

## Sisyphus / OhMyOpenCode Agents

If you are an Oh-my-Opencode agent (Sisyphus, Prometheus, Atlas, Hephaestus):

1. Do not commit anything inside `.sisyphus/`.
2. `.sisyphus/` is already in `.gitignore`.
3. Simplify the QA stage if the task is not complex or critical.

## Other Notes

1. Prefer the latest stable versions for newly added dependencies, unless there is a clear stability risk.
2. **Do not delete files** unless the task explicitly requires pruning, refactoring, or simplification.
3. `AGENTS.md`, `docs/superpowers/`, and `.sisyphus/` are agent-support assets — be mindful of their `.gitignore` status before committing.
4. If the current objective is fully done and the conversation context no longer helps, you may suggest opening a new session.
5. `node_modules/next/dist/docs/` is the source of truth for Next.js behaviour — read it before relying on training-data knowledge of Next.js APIs (see the auto-managed Next.js block below).

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **gtmc** (4539 symbols, 10254 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
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

<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->
