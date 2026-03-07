# Decouple Features GitHub Repo Environment Variables

## TL;DR
> **Summary**: Isolate Features issue-target repository configuration from shared GitHub repository variables so Features can write to a dedicated repo without changing Admin/Vercel listener behavior.
> **Deliverables**:
> - Features module reads `FEATURES_GITHUB_REPO_OWNER` and `FEATURES_GITHUB_REPO_NAME`
> - Admin module remains on `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME`
> - Strict no-fallback guardrails and verification evidence
> **Effort**: Short
> **Parallel**: NO
> **Critical Path**: Task 1 -> Task 2 -> Task 3 -> Task 4 -> Task 5 -> Task 6

## Context
### Original Request
User requires separate environment variables for Features GitHub target repo because shared vars also control Vercel listener/admin target repo.

### Interview Summary
- Features and Admin currently share `GITHUB_REPO_OWNER`/`GITHUB_REPO_NAME`.
- User explicitly requested separate variables for Features repo targeting.
- Keep PAT model unchanged unless requested (`GITHUB_SYSTEM_PAT` remains).
- Avoid reverting ongoing dependency-upgrade changes in workspace.

### Metis Review (gaps addressed)
- Enforce strict no-fallback for Features repo vars to avoid accidental cross-repo writes.
- Keep `actions/admin.ts` unchanged to preserve workflow dispatch behavior.
- Add explicit rollout verification for local + deployment env setup.
- Ensure acceptance criteria are fully agent-executable.

## Work Objectives
### Core Objective
Ensure Features GitHub API calls use dedicated repo-target env vars, while Admin workflow dispatch keeps existing shared vars unchanged.

### Deliverables
- Updated env resolution in `lib/github-features.ts` for Features-only repo targeting.
- Updated Features config error text to reference new variable names.
- Verification artifacts proving admin flow remains unchanged and no fallback exists.
- Rollout checklist for local and deployment environments.

### Definition of Done (verifiable conditions with commands)
- `lib/github-features.ts` reads only `FEATURES_GITHUB_REPO_OWNER` and `FEATURES_GITHUB_REPO_NAME` for repo targeting.
- `actions/admin.ts` still reads `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME`.
- No fallback expression from `FEATURES_GITHUB_*` to `GITHUB_REPO_*` exists in features module.
- `bun run build` succeeds in current workspace state.
- Feature module env-missing message references the new Features variable names.

### Must Have
- Strict isolation of Features repo owner/name env vars.
- No behavior changes in Feature action/page call sites beyond config source.
- Admin module untouched for repo-owner/name resolution.
- Verification evidence written to `.sisyphus/evidence/` paths.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No fallback logic from `FEATURES_GITHUB_*` to shared `GITHUB_REPO_*`.
- No admin workflow refactor or rename in `actions/admin.ts`.
- No token model redesign (`GITHUB_SYSTEM_PAT` remains as-is).
- No unrelated dependency/version or Prisma config edits.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: none (no new framework) + command-level verification.
- QA policy: Every task includes agent-executed happy path + failure/edge scenario.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: discovery and contract lock (Tasks 1-2)
Wave 2: implementation and safety guards (Tasks 3-4)
Wave 3: rollout verification and cleanup (Tasks 5-6)

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 2-6
- Task 2 blocks Tasks 3-6
- Task 3 blocks Tasks 4-6
- Task 4 blocks Tasks 5-6
- Task 5 blocks Task 6

### Agent Dispatch Summary (wave -> task count -> categories)
- Wave 1 -> 2 tasks -> quick, unspecified-low
- Wave 2 -> 2 tasks -> quick, unspecified-high
- Wave 3 -> 2 tasks -> unspecified-low, quick

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Lock Exact Env-Var Touchpoints and Non-Touch Zones

  **What to do**: Confirm and freeze the exact files/symbols where repo owner/name vars are read so execution changes only intended scope.
  **Must NOT do**: Do not edit code in this task; this task is contract locking only.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` — Reason: low-effort audit and guardrail capture.
  - Skills: `[]` — direct repo inspection is sufficient.
  - Omitted: `['playwright']` — no UI interaction.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2,3,4,5,6] | Blocked By: []

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `lib/github-features.ts:89` — `getGithubRepoConfig()` defines Features repo config source.
  - Pattern: `lib/github-features.ts:90` — current `process.env.GITHUB_REPO_OWNER` read to replace.
  - Pattern: `lib/github-features.ts:91` — current `process.env.GITHUB_REPO_NAME` read to replace.
  - Pattern: `lib/github-features.ts:98` — current CONFIG_MISSING message text.
  - Pattern: `actions/admin.ts:65` — admin repo owner var read that must remain unchanged.
  - Pattern: `actions/admin.ts:66` — admin repo name var read that must remain unchanged.

  **Acceptance Criteria** (agent-executable only):
  - [ ] A checklist file in evidence records exactly 4 mutable lines in `lib/github-features.ts` (90, 91, 98 and adjacent return scope) and 0 mutable lines in `actions/admin.ts`.
  - [ ] Command output proves no existing `FEATURES_GITHUB_REPO_OWNER`/`FEATURES_GITHUB_REPO_NAME` references before implementation.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Touchpoint discovery happy path
    Tool: Bash
    Steps: Run grep commands for GITHUB_REPO_OWNER/GITHUB_REPO_NAME and FEATURES_GITHUB_REPO_OWNER/FEATURES_GITHUB_REPO_NAME across repo.
    Expected: Shared vars appear in `lib/github-features.ts` and `actions/admin.ts`; FEATURES vars absent before change.
    Evidence: .sisyphus/evidence/task-1-touchpoint-audit.txt

  Scenario: Scope drift edge case
    Tool: Bash
    Steps: Run grep restricted to `actions/` and verify only `actions/admin.ts` matches repo-owner/name vars.
    Expected: No additional action files depend on shared repo vars.
    Evidence: .sisyphus/evidence/task-1-touchpoint-audit-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: evidence only

- [x] 2. Define Features-Specific Env Contract (Strict, No Fallback)

  **What to do**: Finalize config contract: Features must read `FEATURES_GITHUB_REPO_OWNER` and `FEATURES_GITHUB_REPO_NAME` only; token remains `GITHUB_SYSTEM_PAT`.
  **Must NOT do**: Do not introduce fallback logic to shared vars.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: concise contract codification and validation notes.
  - Skills: `[]` — straightforward decision capture.
  - Omitted: `['frontend-ui-ux']` — backend config contract only.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [3,4,5,6] | Blocked By: [1]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `lib/github-features.ts:92` — keep `GITHUB_SYSTEM_PAT` unchanged.
  - Pattern: `actions/admin.ts:65` — shared var remains for Admin path.
  - Pattern: `actions/admin.ts:66` — shared var remains for Admin path.
  - External: `https://nextjs.org/docs/app/guides/environment-variables` — env loading behavior across dev/build/runtime.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Contract note in evidence explicitly states strict no-fallback rule and unchanged admin variable rule.
  - [ ] Contract includes exact required Features env keys and exact unchanged shared keys.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Contract completeness happy path
    Tool: Bash
    Steps: Generate plain-text checklist covering key ownership: FEATURES vars for features module, shared vars for admin module, shared token for both.
    Expected: Checklist contains all five keys and ownership mapping with no ambiguity.
    Evidence: .sisyphus/evidence/task-2-env-contract.txt

  Scenario: Fallback prohibition edge case
    Tool: Bash
    Steps: Validate checklist contains explicit ban on `|| process.env.GITHUB_REPO_OWNER` and `|| process.env.GITHUB_REPO_NAME` in features config.
    Expected: Ban statement exists verbatim.
    Evidence: .sisyphus/evidence/task-2-env-contract-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: evidence only

- [x] 3. Update Features Repo Config Resolution in `lib/github-features.ts`

  **What to do**: Replace Features repo owner/name env reads in `getGithubRepoConfig()` with `FEATURES_GITHUB_REPO_OWNER` and `FEATURES_GITHUB_REPO_NAME`; keep token read as `GITHUB_SYSTEM_PAT`.
  **Must NOT do**: Do not modify API behavior, function signatures, or any call sites in `actions/feature.ts` or page files.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: small, surgical code change.
  - Skills: `[]` — no additional domain skill required.
  - Omitted: `['playwright']` — non-UI change.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [4,5,6] | Blocked By: [2]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `lib/github-features.ts:89` — function boundary for config reads.
  - Pattern: `lib/github-features.ts:90` — replace owner env key.
  - Pattern: `lib/github-features.ts:91` — replace repo env key.
  - Pattern: `lib/github-features.ts:92` — token key remains unchanged.
  - Pattern: `actions/feature.ts:5` — downstream imports depend on unchanged function exports.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `lib/github-features.ts` contains `process.env.FEATURES_GITHUB_REPO_OWNER` and `process.env.FEATURES_GITHUB_REPO_NAME`.
  - [ ] `lib/github-features.ts` no longer contains `process.env.GITHUB_REPO_OWNER` or `process.env.GITHUB_REPO_NAME`.
  - [ ] `lib/github-features.ts` still contains `process.env.GITHUB_SYSTEM_PAT`.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Env key replacement happy path
    Tool: Bash
    Steps: Grep `lib/github-features.ts` for FEATURES_GITHUB_REPO_OWNER, FEATURES_GITHUB_REPO_NAME, and GITHUB_SYSTEM_PAT.
    Expected: All three keys found in getGithubRepoConfig.
    Evidence: .sisyphus/evidence/task-3-config-rewire.txt

  Scenario: Legacy key residue failure case
    Tool: Bash
    Steps: Grep `lib/github-features.ts` for `process.env.GITHUB_REPO_OWNER` and `process.env.GITHUB_REPO_NAME`.
    Expected: Zero matches.
    Evidence: .sisyphus/evidence/task-3-config-rewire-error.txt
  ```

  **Commit**: YES | Message: `refactor(features): Decouple Features repo env variables.` | Files: `lib/github-features.ts`

- [x] 4. Update Config Error Messaging for Features Env Keys

  **What to do**: Update `CONFIG_MISSING` message in `getGithubRepoConfig()` to reference Features-specific repo keys and unchanged token key.
  **Must NOT do**: Do not change error code (`CONFIG_MISSING`) or exception class (`GithubFeaturesError`).

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: single-string correctness fix.
  - Skills: `[]` — no additional skill needed.
  - Omitted: `['frontend-ui-ux']` — backend error text only.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [5,6] | Blocked By: [3]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `lib/github-features.ts:95` — thrown `GithubFeaturesError` location.
  - Pattern: `lib/github-features.ts:96` — `code: "CONFIG_MISSING"` must remain unchanged.
  - Pattern: `lib/github-features.ts:98` — message text to update.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Message lists `FEATURES_GITHUB_REPO_OWNER`, `FEATURES_GITHUB_REPO_NAME`, and `GITHUB_SYSTEM_PAT` exactly.
  - [ ] Message does not mention `GITHUB_REPO_OWNER`/`GITHUB_REPO_NAME` in Features config path.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Error text happy path
    Tool: Bash
    Steps: Read the updated message string and assert exact env key names in order.
    Expected: Message matches strict Features-key wording.
    Evidence: .sisyphus/evidence/task-4-error-message.txt

  Scenario: Wrong-key regression case
    Tool: Bash
    Steps: Grep message for bare `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME`.
    Expected: No bare shared key names present in the Features config message.
    Evidence: .sisyphus/evidence/task-4-error-message-error.txt
  ```

  **Commit**: YES | Message: `chore(features): Clarify Features env configuration errors.` | Files: `lib/github-features.ts`

- [x] 5. Validate Admin Isolation and No-Fallback Guardrails

  **What to do**: Prove admin flow remains unchanged and Features module contains no fallback or shared repo-var dependency.
  **Must NOT do**: Do not modify `actions/admin.ts` unless a pre-existing unrelated lint/format change appears in working tree.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: safety verification against cross-repo misrouting.
  - Skills: `[]` — grep/read verification is sufficient.
  - Omitted: `['playwright']` — no browser behavior involved.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [6] | Blocked By: [4]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `actions/admin.ts:65` — must still read `GITHUB_REPO_OWNER`.
  - Pattern: `actions/admin.ts:66` — must still read `GITHUB_REPO_NAME`.
  - Pattern: `lib/github-features.ts:89` — Features config function to scan for fallback.
  - Pattern: `lib/github-features.ts:105` — downstream URL construction must stay intact.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `actions/admin.ts` still has shared repo key reads unchanged.
  - [ ] `lib/github-features.ts` contains no `|| process.env.GITHUB_REPO_OWNER` or `|| process.env.GITHUB_REPO_NAME` fallback logic.
  - [ ] No additional files in `actions/` read `FEATURES_GITHUB_REPO_OWNER`/`FEATURES_GITHUB_REPO_NAME`.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Admin isolation happy path
    Tool: Bash
    Steps: Grep `actions/admin.ts` for `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME`; compare with pre-change baseline.
    Expected: Both matches remain present and unchanged.
    Evidence: .sisyphus/evidence/task-5-admin-isolation.txt

  Scenario: Fallback guard failure case
    Tool: Bash
    Steps: Grep `lib/github-features.ts` for regex `FEATURES_GITHUB_REPO_(OWNER|NAME)\s*\|\|\s*process\.env\.GITHUB_REPO_`.
    Expected: Zero matches.
    Evidence: .sisyphus/evidence/task-5-admin-isolation-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: evidence only

- [x] 6. Run Build Verification and Capture Env Rollout Steps

  **What to do**: Run final build/type validation and produce explicit local/deploy env rollout checklist for executor handoff.
  **Must NOT do**: Do not alter dependency versions, lockfiles, or Prisma config while validating this plan.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: final verification and documentation capture.
  - Skills: `[]` — standard commands only.
  - Omitted: `['frontend-ui-ux']` — no UI modifications.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [] | Blocked By: [5]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `package.json:7` — build script (`next build`) verification entry point.
  - Pattern: `lib/github-features.ts:95` — expected config error source if Features vars absent.
  - Pattern: `actions/feature.ts:65` — downstream feature flows rely on github-features config.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun run build` succeeds in current workspace state.
  - [ ] Evidence includes explicit env rollout matrix for local and deployment:
  - [ ] `FEATURES_GITHUB_REPO_OWNER`
  - [ ] `FEATURES_GITHUB_REPO_NAME`
  - [ ] `GITHUB_SYSTEM_PAT`
  - [ ] Existing admin vars (`GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`) retained.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Build and static analysis happy path
    Tool: Bash
    Steps: Run `bun run build` and capture output; run targeted grep validations from tasks 3-5.
    Expected: Build exits 0 and grep checks match expected counts.
    Evidence: .sisyphus/evidence/task-6-final-verify.txt

  Scenario: Misconfiguration edge case
    Tool: Bash
    Steps: Run node one-liner that calls `getGithubRepoConfig()` in a controlled shell with FEATURES vars unset and token set.
    Expected: Throws `GithubFeaturesError` with `CONFIG_MISSING` mentioning Features keys.
    Evidence: .sisyphus/evidence/task-6-final-verify-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: evidence only

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit 1: `refactor(features): Decouple Features repo env variables.`

## Success Criteria
- Features issue operations can target a different repo from Admin workflow dispatch.
- Misconfiguration fails loudly in Features module with explicit new env names.
- Admin workflow dispatch remains behavior-identical to current implementation.
