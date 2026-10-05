# AGENTS.md

Agent context for the **GTMC website** (Graduate Texts in Minecraft), live at <https://www.techmc.wiki> (Vercel infra, Cloudflare DNS).

## Stack

- Next.js 16 (App Router, Turbopack) on React 19, TypeScript strict mode
- Tailwind CSS v4 (`DESIGN.md` / `app/globals.css`); shadcn/ui primitives (`components/ui/shadcn/`)
- Private Vercel Blob drafts + NextAuth v5 (GitHub provider, JWT sessions); next-intl i18n
- Markdown pipeline (remark/rehype, KaTeX, Shiki) over `content/articles` and `content/glossary`; Minecraft property data from `content/properties`
- pnpm 12 workspace, Vite+ (`vp` for Oxlint, Oxfmt, Vitest)
- Typst 0.15.1 for book PDFs in `tools/pdf` (`brew install typst`)

## Layout

```text
apps/web/       Next.js site (@gtmc/web)
  app/          App Router (locale-scoped [locale] routes, api/)
  actions/      Server actions
  components/   UI components (primitives in components/ui/shadcn/)
  lib/          Article pipeline, auth, drafts, search, GitHub helpers
  hooks/        Shared React hooks
  i18n/         next-intl config; catalogs in messages/ (en.json, zh.json)
  scripts/      Manifest, content, and PDF generators
  proxy.ts      Auth + i18n middleware
tools/pdf/      Typst book template and PDF build (see tools/pdf/README.md)
packages/ssg/   Article generation and shared Markdown transforms (@gtmc/ssg)
content/        Git submodules (articles, glossary, properties)
```

`content/articles`, `content/glossary`, and `content/properties` are git submodules pinned at the workspace root, not under `apps/web`. Code that needs them must use `lib/workspace-paths.ts` (`getWorkspaceRoot()` / `workspacePath(...)`), never `process.cwd()`.

## Setup & Commands

```bash
vp install              # Install dependencies with pinned pnpm + run postinstall
cp apps/web/.env.example apps/web/.env
pnpm dev                # Start development server at http://localhost:3000
brew install typst      # PDF builds need the typst binary (CI pins 0.15.1; TYPST_BIN overrides)
```

```bash
pnpm check                       # vp check (oxfmt + oxlint) + tsc --noEmit
pnpm typecheck                   # tsc --noEmit only
pnpm test                        # Run all Vitest suites
pnpm build                       # Full build: content generation + next build
pnpm build:content               # Static content and manifest generation
pnpm build:next                  # Next.js production build
pnpm build:pdf                   # Build tools/pdf/dist/gtmc-{en,zh}.pdf
pnpm bump [patch|minor|major]    # Bump version, commit, and create tag (dev branch only)
pnpm articles:update             # Pull latest articles submodule commit
pnpm glossary:update             # Pull latest glossary submodule commit

# Targeted checks (from apps/web):
cd apps/web
vp check --fix                   # Auto-format and autofix lint findings
vp test run <file-path>          # Run a specific test file
vp test run -t "<test-name>"     # Filter by test name
```

- Run standalone scripts with `vpx <file>` (handles TS and tsconfig paths; do not use `tsx` or `ts-node`).
- Before declaring any build-affecting change complete, run `pnpm check && pnpm test`.

## Cloudflare

The `cf` CLI manages Cloudflare edge resources (DNS for `techmc.wiki`, R2 bucket `gtmc-pdf` for book PDFs, cache, and worker previews):

- Run `cf` to see guides.
- Never use `wrangler`.

## Testing

- Test only on logic-heavy code. Assert on higher-level behavior (API responses, server actions, route handlers) rather than implementation details.
- Do not add tests for UI components unless they have nontrivial logic (state, effects, context).

## Code Style

- Never bypass types with `as any`, `@ts-ignore`, or `@ts-expect-error`; fix root types.
- Use existing shadcn/ui components (`components/ui/shadcn/`) before creating custom primitives. Follow `DESIGN.md` for styling, tokens, and geometry.
- Imports use `@/*`, resolving to `apps/web`. Server actions in `actions/`; route handlers in `app/api/`; middleware in `proxy.ts`.

## Git

- Conventional Commits (`<type>(<scope>): <subject>`, max 72 chars; types: `feat`, `fix`, `refactor`, `docs`, `style`, `chore`, `test`, `perf`).
- Commit submodule changes separately as `chore(submodule): bump <module_name>`. Don't bump submodules unless there are related changes in the main codebase. Latest submodules are pulled during CD.
- Do not run `git push` or `git pull` on `dev` or `production` without permission.

### Publishing GitHub Releases

Releases use `vX.Y.Z` (semver) from `dev`. Ensure the target commit is on remote `dev`, worktree is clean, and pick the next version (`feat` → minor, `fix`/`perf` → patch, breaking → major).

1. Run the bump script on `dev` (updates `apps/web/package.json` and `package.json`, commits, and creates an annotated tag; defaults to `patch`):

   ```bash
   pnpm bump [patch|minor|major]
   ```

2. Push the tag:

   ```bash
   git push origin vX.Y.Z
   ```

3. Edit release notes on GitHub (always preserve the leading website link, followed by `Features:` and optional `Dev:` headings with numbered lists; verify not draft/prerelease):

   ```bash
   gh release edit vX.Y.Z \
     --repo techmc-wiki/gtmc \
     --notes $'[Graduate Texts in Minecraft](https://www.techmc.wiki)\n\nFeatures:\n\n1. Describe the user-facing change\n\nDev:\n\n1. Describe the developer-facing change'
   ```

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Running Scripts

Run TypeScript and JavaScript files with `vpx <file>`, for example `vpx ./scripts/seed.ts --dry-run`. It handles enums, decorators, JSX, and tsconfig `paths`, so do not add `tsx` or `ts-node` to run scripts. `vpx --watch <file>` reruns the file when a file it uses changes, in place of `tsx watch`. `vp node <file>` runs plain Node.js.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
