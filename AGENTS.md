# Agents

This document defines repository-specific conventions for coding agents.

## Sisyphus Agents

If you are an Oh-my-Opencode agent (Sisyphus, Prometheus, Atlas, Hephaestus):

1. Do not commit anything inside `.sisyphus/`.
2. `.sisyphus/` is already in `.gitignore`.
3. Simplify the QA stage if the task is not complex or critical

## Aesthetic Style

The frontend follows a **technical blueprint / scientific drafting** aesthetic. Core characteristics:

1. **Tech Flat visual language**: thin borders, low-saturation blue-gray tones, square primary controls, low-noise motion.
   - References: `app/globals.css`, `components/ui/brutal-card.tsx`, `components/ui/brutal-button.tsx`
2. **Unified theme variables**: prefer reusing `--color-tech-*` and `--font-*`; avoid ad-hoc hardcoded styles.
   - Reference: `app/globals.css`
3. **Technical decoration conventions**: corner brackets, grid backgrounds, monospace labels, subtle hover feedback.
   - References: `components/ui/corner-brackets.tsx`, `components/ui/status-badge.tsx`
4. **Responsive and touch-first**: mobile-first layouts with sufficient touch targets (e.g., 44px).
   - References: `touch-target` in `app/globals.css`, `components/ui/brutal-button.tsx`

## Commit Labeling

### 1) Format

Use Conventional Commits style for commit titles:

`<type>(<scope>): <subject>`

- `<scope>` is optional (when scope is too broad or unclear)
- `<subject>` should be imperative and start with a capital letter
- Strictly keep the message within 72 characters

### 2) Allowed `type` values

- `feat`: new feature
- `fix`: bug fix
- `refactor`: code restructure (no new feature, no bug fix)
- `docs`: documentation only
- `style`: formatting/style-only changes (no semantic changes)
- `chore`: build/scripts/dependency/general maintenance
- `test`: test-related work
- `perf`: performance optimization

### 3) Align with repository history

Recent history frequently uses `fix(scope): ...`, `feat(scope): ...`, and `chore(scope): ...`.
Prefer including a scope (e.g., `sidebar`, `build`, `deps`, `api/*`) for traceability.

### 4) Splitting principles

1. Each commit should be single-purpose, easily reversible, and purely atomic.
2. **Do not** mix articles submodule updates into feature/fix commits (see `CONTRIBUTING.md`).

## Git Rules

1. If not otherwise specified, you may create commits.
2. You must **NOT** run `git push` or `git pull`.
3. Do not create new branches or worktrees unless explicitly asked.
4. If your patch is very large, split it into multiple meaningful commits.
5. Keep commits medium-sized and maximally reversible.
6. If files/commit hashes changed unexpectedly (e.g., rebase), do not force-revert unrelated changes.

## Testing

1. Do not add/propose tests unless explicitly requested.
2. Tests are handled as isolated tasks when requested.
3. You may use `go test` for auditing when needed.

## Other Notes

1. Prefer latest stable versions for newly added dependencies unless there is a clear stability risk.
2. Do **not** delete files unless the task explicitly requires pruning/refactoring/simplification.
3. `AGENTS.md`, `docs/superpowers/`, and `.sisyphus/` are agent-support assets; be mindful of their `.gitignore` status.
4. If the current objective is fully done and conversation context no longer helps, you may suggest opening a new session.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **gtmc** (4666 symbols, 7746 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

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
