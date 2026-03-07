# Features Migration to GitHub Issues

## TL;DR
> **Summary**: Replace Prisma-backed Features/Comments with GitHub Issues as the source of truth, while preserving existing `/features` UX and app-side authorization.
> **Deliverables**:
> - GitHub Issues-backed reads/writes for list/detail/create/edit/comment/assign/resolve
> - Identity recording in open issues with public display
> - Cache/rate-limit-safe fetch path and revalidation behavior
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 -> Task 2 -> Task 4 -> Task 5 -> Task 7

## Context
### Original Request
Migrate Features (issue feedback) to GitHub Issues backend, use automation instead of direct user issue creation, fetch/display from frontend, and record user login identity in open issues.

### Interview Summary
- GitHub Issues is the only backend for Features in this migration.
- Identity in open issues should be publicly visible for recognition.
- Identity must not depend on GitHub account mapping (future non-GitHub login providers).
- Write operations can use PAT/App Token and appear as bot/system actor.
- No new test framework in this migration; executable QA scenarios are still mandatory.
- Keep legacy-style ID mapping with local index sequence starting at 0.
- Existing Prisma Feature data is test-only and does not require migration.
- Tags map to GitHub labels.
- Explanation is stored in issue body structured section; discussion remains comments.
- App assignee should synchronize to GitHub assignee.

### Metis Review (gaps addressed)
- Keep frontend route/UX stable; swap data source behind server logic.
- Explicitly handle GitHub issue number vs existing feature ID expectations.
- Preserve authorization matrix from existing `actions/feature.ts`.
- Add rate-limit/caching guardrails and issue-vs-PR filtering.
- Keep QQ notification behavior compatible with new ID strategy.

## Work Objectives
### Core Objective
Deliver a GitHub Issues-backed Features module that behaves like current product flows (create, edit, assign, resolve, comment, list, detail) with app-side auth and public identity traceability.

### Deliverables
- `lib/github-features.ts` helper layer for GitHub Issues API interactions.
- Updated feature server actions and feature pages consuming GitHub Issues data.
- Identity serialization/deserialization contract for issue body and system comments.
- Status/tag/assignee mapping rules documented in code and used consistently.
- Migration-safe behavior notes for existing IDs and links.

### Definition of Done (verifiable conditions with commands)
- `npm run build` succeeds after migration.
- `curl -s http://localhost:3000/features` renders list backed by GitHub issues (not Prisma Feature query path).
- Creating a feature from UI results in a new GitHub issue with expected metadata markers.
- Updating/assigning/resolving/commenting from UI updates the same GitHub issue.
- Unauthorized role/action paths still reject with expected errors.

### Must Have
- Preserve existing authorization rules from `actions/feature.ts`.
- Exclude pull requests when listing issues.
- Preserve current `revalidatePath("/features")` and `revalidatePath("/features/[id]")` behavior equivalents.
- Public identity visible in open issue content and parseable for app rendering.
- No direct client-side GitHub credential usage.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No migration of Article/Revision modules.
- No UI redesign or route tree redesign beyond required ID compatibility.
- No webhook subsystem unless explicitly needed for this iteration.
- No dependency on end-user GitHub account linkage.
- No silent fallback to stale Prisma Feature data without explicit marker.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: none (no new framework) + command/HTTP-level verification.
- QA policy: Every task includes happy path + failure/edge scenario.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: foundation contracts and GitHub integration primitives (Tasks 1-3)
Wave 2: read/mutation flow migration (Tasks 4-7)
Wave 3: compatibility hardening and cleanup (Tasks 8-10)

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 2-10
- Task 2 blocks Tasks 4-10
- Task 3 blocks Tasks 6-8
- Task 4 blocks Tasks 5, 7, 8, 10
- Task 5 blocks Tasks 7-10
- Task 6 blocks Tasks 7-9
- Task 7 blocks Tasks 9-10
- Task 8 blocks Task 10
- Task 9 blocks Task 10

### Agent Dispatch Summary (wave -> task count -> categories)
- Wave 1 -> 3 tasks -> deep, unspecified-high
- Wave 2 -> 4 tasks -> deep, unspecified-high, quick
- Wave 3 -> 3 tasks -> unspecified-high, quick

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Build GitHub Features Integration Core

  **What to do**: Create `lib/github-features.ts` that centralizes GitHub Issues REST calls (list/get/create/update/comment/label) using env vars (`GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, token source), standard headers, pagination helper, and issue-vs-PR filtering.
  **Must NOT do**: Do not call GitHub API directly from client components; do not introduce Octokit in this migration.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this module defines core contracts used by all feature flows.
  - Skills: `[]` — no extra domain skill needed beyond repo conventions.
  - Omitted: `['playwright']` — backend integration only.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2,3,4,5,6,7,8,9,10] | Blocked By: []

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `actions/admin.ts:62` — current GitHub API `fetch` style with token header.
  - Pattern: `actions/admin.ts:63` — existing owner/repo env configuration convention.
  - Pattern: `app/api/upload/route.ts:17` — route-level error response shape style.
  - API/Type: `actions/feature.ts:27` — current feature action contract surface to preserve.
  - External: `https://docs.github.com/en/rest/issues/issues` — issues endpoints and payload.
  - External: `https://docs.github.com/en/rest/guides/using-pagination-in-the-rest-api` — link-header pagination behavior.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `lib/github-features.ts` exports typed helpers for list/get/create/update/comment operations.
  - [ ] List helper excludes pull requests by filtering `pull_request` entries.
  - [ ] Helper returns normalized app-facing shape (status, tags, authorIdentity, assigneeIdentity, comments metadata).

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: GitHub list happy path
    Tool: Bash
    Steps: Run app in dev; call internal helper via temporary server action invocation path; request open issues list.
    Expected: Returns only issues (no PR rows), with normalized fields populated.
    Evidence: .sisyphus/evidence/task-1-github-core.txt

  Scenario: GitHub auth failure
    Tool: Bash
    Steps: Unset token env; invoke same list path.
    Expected: Deterministic authorization/config error is returned and logged without leaking token values.
    Evidence: .sisyphus/evidence/task-1-github-core-error.txt
  ```

  **Commit**: YES | Message: `refactor(features): Add GitHub issues integration core.` | Files: `lib/github-features.ts`

- [ ] 2. Define Identity + Metadata Serialization Contract

  **What to do**: Implement issue body/comment metadata format that stores app login identity and app-level mapping fields; parse it back safely for frontend rendering and authorization decisions.
  **Must NOT do**: Do not bind identity logic to GitHub user account IDs/logins.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: contract correctness is critical but scoped.
  - Skills: `[]` — repository-native TypeScript patterns are sufficient.
  - Omitted: `['playwright']` — no browser interaction required.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [4,5,6,7,8,9,10] | Blocked By: [1]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `app/(dashboard)/features/[id]/page.tsx:74` — current author rendering contract.
  - Pattern: `app/(dashboard)/features/[id]/feature-comments.tsx:19` — expected comment shape in UI.
  - API/Type: `prisma/schema.prisma:112` — current Feature fields that need mapping continuity.
  - API/Type: `prisma/schema.prisma:132` — current FeatureComment fields to preserve behavior.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Serializer writes publicly visible identity section in open issue content per requirement.
  - [ ] Parser handles missing/corrupt metadata without crashing and returns safe fallback values.
  - [ ] Metadata includes app user identifiers usable for app-side permission checks.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Serialize + parse happy path
    Tool: Bash
    Steps: Run targeted node/ts invocation for serializer and parser with sample user payload.
    Expected: Round-trip preserves identity fields and returns expected normalized structure.
    Evidence: .sisyphus/evidence/task-2-identity-contract.txt

  Scenario: Corrupt metadata edge case
    Tool: Bash
    Steps: Parse malformed metadata block.
    Expected: Parser returns fallback identity and explicit parse error flag, no throw.
    Evidence: .sisyphus/evidence/task-2-identity-contract-error.txt
  ```

  **Commit**: YES | Message: `refactor(features): Add identity metadata contract for issues.` | Files: `lib/github-features.ts`

- [ ] 3. Lock Mapping Decisions for Status, Tags, and Explanation

  **What to do**: Implement mapping rules for current feature semantics to GitHub Issue constructs and codify unresolved policy decisions as constants/handlers.
  **Must NOT do**: Do not leave implicit mapping spread across multiple components.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: mapping drives all read/write behavior and failure cases.
  - Skills: `[]` — no extra skills required.
  - Omitted: `['frontend-ui-ux']` — no UI redesign.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [6,7,8] | Blocked By: [1]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `actions/feature.ts:114` — `IN_PROGRESS` assignment semantics.
  - Pattern: `actions/feature.ts:150` — `RESOLVED` semantics and optional resolution comment.
  - Pattern: `components/editor/feature-editor.tsx:137` — current create/update payload fields (`title/content/tags`).
  - External: `https://docs.github.com/en/rest/issues/labels` — labels API behavior.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Status mapping implemented: `PENDING`, `IN_PROGRESS`, `RESOLVED` <-> issue state + labels.
  - [ ] Tags mapping and explanation mapping are deterministic and documented in-code.
  - [ ] Decision placeholders exist where user confirmation is still required.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Status mapping happy path
    Tool: Bash
    Steps: Execute mapping helpers for all three statuses.
    Expected: Outputs expected issue state/labels combinations.
    Evidence: .sisyphus/evidence/task-3-mapping-rules.txt

  Scenario: Unknown status failure case
    Tool: Bash
    Steps: Execute mapping helper with unsupported status.
    Expected: Returns explicit controlled error and no silent fallback.
    Evidence: .sisyphus/evidence/task-3-mapping-rules-error.txt
  ```

  **Commit**: YES | Message: `refactor(features): Centralize feature-to-issue mapping rules.` | Files: `lib/github-features.ts`

- [ ] 7. Migrate Assign, Unassign, Resolve Status Operations

  **What to do**: Route `assignFeature`, `unassignFeature`, `resolveFeature` to GitHub issue state/label updates while preserving current app authorization semantics and resolution comment behavior.
  **Must NOT do**: Do not silently change role permissions unless explicitly documented as migration policy.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: intersects authorization, state machine, and data mapping.
  - Skills: `[]` — action-layer parity work.
  - Omitted: `['frontend-ui-ux']` — no visual redesign.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [9,10] | Blocked By: [3,4,5,6]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `actions/feature.ts:107` — assign behavior (`IN_PROGRESS`, assignee).
  - Pattern: `actions/feature.ts:124` — unassign behavior (`PENDING`, null assignee).
  - Pattern: `actions/feature.ts:141` — resolve behavior + optional resolution note.
  - Pattern: `app/(dashboard)/features/[id]/feature-actions.tsx:20` — action invocations from UI.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Assign/unassign/resolve update GitHub issue state/labels consistently with mapping rules.
  - [ ] Admin-only resolve remains enforced.
  - [ ] Optional resolution comment remains visible on feature detail.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Assign/unassign/resolve happy path
    Tool: Bash
    Steps: Trigger assign, unassign, resolve actions in sequence for one issue.
    Expected: `/features/{id}` reflects status transitions and resolution note.
    Evidence: .sisyphus/evidence/task-7-status-ops.txt

  Scenario: Resolve permission failure
    Tool: Bash
    Steps: Non-admin triggers resolve.
    Expected: Action rejected; issue state remains unchanged.
    Evidence: .sisyphus/evidence/task-7-status-ops-error.txt
  ```

  **Commit**: YES | Message: `refactor(features): Migrate assignment and resolution operations.` | Files: `actions/feature.ts`, `app/(dashboard)/features/[id]/feature-actions.tsx`

- [ ] 8. Implement ID and URL Compatibility Strategy

  **What to do**: Implement canonical ID handling for `/features/[id]` and redirects, using legacy-style local mapping index (starting at 0) to GitHub issue numbers, including QQ notification URL generation and path revalidation alignment.
  **Must NOT do**: Do not ship mixed ID formats without deterministic resolver.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: compatibility and routing correctness.
  - Skills: `[]` — no extra skill required.
  - Omitted: `['playwright']` — route/data behavior focus.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [10] | Blocked By: [4,5,7]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `components/editor/feature-editor.tsx:139` — redirect uses returned feature ID.
  - Pattern: `actions/feature.ts:52` — QQ payload currently builds `/features/${feature.id}`.
  - Pattern: `app/(dashboard)/features/[id]/page.tsx:14` — current route param lookup.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Canonical ID format is enforced in all create/read/update routes.
  - [ ] QQ notification URL always resolves to correct feature detail page.
  - [ ] Revalidation paths correspond to canonical ID behavior.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Canonical route happy path
    Tool: Bash
    Steps: Create feature then follow returned URL and QQ payload URL.
    Expected: Both URLs resolve to same feature detail successfully.
    Evidence: .sisyphus/evidence/task-8-id-compatibility.txt

  Scenario: Invalid ID format edge case
    Tool: Bash
    Steps: Request `/features/invalid-id-format`.
    Expected: Deterministic error/not-found response, no server crash.
    Evidence: .sisyphus/evidence/task-8-id-compatibility-error.txt
  ```

  **Commit**: YES | Message: `refactor(features): Normalize feature issue ID routing.` | Files: `components/editor/feature-editor.tsx`, `actions/feature.ts`, `app/(dashboard)/features/[id]/page.tsx`

- [ ] 9. Add Caching, Pagination, and Rate-Limit Safeguards

  **What to do**: Add server-side caching/revalidation strategy for GitHub-backed reads and reliable pagination traversal for list views.
  **Must NOT do**: Do not rely on single-page (`per_page` only) fetch for complete list.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: performance + reliability cross-cutting concern.
  - Skills: `[]` — built-in Next.js patterns apply.
  - Omitted: `['frontend-ui-ux']` — non-visual infra task.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: [10] | Blocked By: [1,2,5,6,7]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `actions/feature.ts:56` — current invalidation pattern baseline.
  - Pattern: `app/(dashboard)/features/page.tsx:10` — current list load behavior.
  - External: `https://docs.github.com/en/rest/guides/best-practices-for-using-the-rest-api` — avoid aggressive polling.
  - External: `https://docs.github.com/en/rest/guides/using-pagination-in-the-rest-api` — `Link` header pagination.

  **Acceptance Criteria** (agent-executable only):
  - [ ] List read path supports multi-page issue retrieval.
  - [ ] Cache/revalidate strategy prevents unnecessary repetitive GitHub calls under repeated page loads.
  - [ ] Rate-limit responses produce controlled retriable errors.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Pagination + cache happy path
    Tool: Bash
    Steps: Seed >100 test issues in target repo; load `/features` twice.
    Expected: First load includes paginated aggregate results; second load shows cache/revalidate behavior with lower API churn.
    Evidence: .sisyphus/evidence/task-9-cache-pagination.txt

  Scenario: Rate-limit failure case
    Tool: Bash
    Steps: Simulate exhausted token/quota or forced 403/429 response in helper.
    Expected: User-visible controlled error; no unhandled exception.
    Evidence: .sisyphus/evidence/task-9-cache-pagination-error.txt
  ```

  **Commit**: YES | Message: `chore(features): Add cache and rate-limit safeguards for issues.` | Files: `lib/github-features.ts`, `app/(dashboard)/features/page.tsx`

- [ ] 10. Cut Prisma Runtime Dependency and Finalize Migration Safety

  **What to do**: Remove runtime usage of `db.feature`/`db.featureComment` from feature flows, add migration notes for operational rollout, and validate no regressions in affected pages/actions.
  **Must NOT do**: Do not delete Prisma models in this pass; keep schema unchanged until post-cutover confirmation.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: targeted cleanup and verification pass.
  - Skills: `[]` — straightforward consistency checks.
  - Omitted: `['playwright']` — command verification sufficient.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [] | Blocked By: [4,5,7,8,9]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `app/(dashboard)/features/page.tsx:10` — remove direct Prisma read dependency.
  - Pattern: `app/(dashboard)/features/[id]/page.tsx:14` — remove direct Prisma detail dependency.
  - Pattern: `actions/feature.ts:31` — replace all `db.feature.*` calls.
  - API/Type: `prisma/schema.prisma:112` — keep models present for now, no destructive schema change in this migration.

  **Acceptance Criteria** (agent-executable only):
  - [ ] No feature runtime path depends on Prisma Feature/FeatureComment CRUD.
  - [ ] Build passes and feature route/action smoke checks pass.
  - [ ] Migration operational notes include token rotation and rollback switch guidance.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: End-to-end feature flow happy path
    Tool: Bash
    Steps: Run full path: create -> edit -> assign -> comment -> resolve -> list/detail verification.
    Expected: All steps complete against GitHub-backed data with no Prisma runtime fallback.
    Evidence: .sisyphus/evidence/task-10-final-cutover.txt

  Scenario: Rollback readiness edge case
    Tool: Bash
    Steps: Trigger configured fallback flag/path in staging setup.
    Expected: System reports deterministic fallback mode and preserves read availability.
    Evidence: .sisyphus/evidence/task-10-final-cutover-error.txt
  ```

  **Commit**: YES | Message: `refactor(features): Complete GitHub issues migration cutover.` | Files: `actions/feature.ts`, `app/(dashboard)/features/*`, `lib/github-features.ts`

## Decision Locks (Resolved)
- ID Strategy: Use legacy-style local mapping index starting at 0 and map to GitHub issue numbers.
- Historical Data: No migration required; existing data is test-only and can be discarded.
- Tag Mapping: Map app tags to GitHub labels.
- Explanation Storage: Store explanation in issue body structured section; keep discussion in comments.
- Assignee Representation: Synchronize app assignee with GitHub assignee.

- [ ] 4. Migrate Features List and Detail Reads to GitHub

  **What to do**: Replace Prisma reads in `/features` list/detail pages with GitHub-backed normalized reads, keeping existing page/component contracts.
  **Must NOT do**: Do not change visible page structure or remove existing filtering/grouping behaviors.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: affects primary SSR data flow and shape contracts.
  - Skills: `[]` — no extra skill required.
  - Omitted: `['playwright']` — SSR/data migration first.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [5,7,8,10] | Blocked By: [1,2]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `app/(dashboard)/features/page.tsx:10` — current list query and prop handoff.
  - Pattern: `app/(dashboard)/features/[id]/page.tsx:14` — current detail query including comments.
  - Pattern: `app/(dashboard)/features/feature-list.tsx:76` — expected feature list item fields.
  - Pattern: `app/(dashboard)/features/[id]/feature-comments.tsx:19` — expected comment props.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `/features` reads data from GitHub issues (no `db.feature.findMany` runtime call remains in page flow).
  - [ ] `/features/[id]` resolves issue detail + comments with same visible fields as before.
  - [ ] Non-existing issue ID shows existing not-found UX behavior.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: List/detail happy path
    Tool: Bash
    Steps: Start dev server; call `/features` and `/features/{id}` for a known issue.
    Expected: Page renders expected title/status/author/tags/comments values from GitHub data.
    Evidence: .sisyphus/evidence/task-4-read-migration.txt

  Scenario: Detail not found
    Tool: Bash
    Steps: Request `/features/99999999` (non-existent issue).
    Expected: Not-found behavior matches existing app semantics.
    Evidence: .sisyphus/evidence/task-4-read-migration-error.txt
  ```

  **Commit**: YES | Message: `refactor(features): Migrate features reads to GitHub issues.` | Files: `app/(dashboard)/features/page.tsx`, `app/(dashboard)/features/[id]/page.tsx`

- [ ] 5. Migrate Create and Update Feature Actions

  **What to do**: Replace Prisma create/update logic in `createFeature` and `updateFeature` with GitHub issue create/edit operations while preserving permission checks and return contract used by editor.
  **Must NOT do**: Do not relax current author/admin edit checks.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: mutation correctness + auth parity.
  - Skills: `[]` — existing action patterns are clear.
  - Omitted: `['frontend-ui-ux']` — behavior parity only.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [7,8,9,10] | Blocked By: [1,2,4]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `actions/feature.ts:27` — existing create behavior and response shape.
  - Pattern: `actions/feature.ts:60` — existing update auth and validation checks.
  - Pattern: `components/editor/feature-editor.tsx:139` — create action return drives navigation to `/features/{id}`.
  - Pattern: `actions/feature.ts:44` — QQ notification payload currently includes feature URL.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Creating feature generates GitHub issue and returns ID contract compatible with editor redirect.
  - [ ] Updating feature updates the same issue and preserves auth guard (author or admin only).
  - [ ] QQ notification payload remains emitted with correct migrated URL format.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Create/update happy path
    Tool: Bash
    Steps: Submit create from `/features/new`, then update same entry via editor.
    Expected: One issue created, then updated title/content/tags reflected in `/features/{id}`.
    Evidence: .sisyphus/evidence/task-5-mutation-create-update.txt

  Scenario: Unauthorized update
    Tool: Bash
    Steps: Attempt update as non-author non-admin.
    Expected: Action fails with Forbidden-equivalent error and no GitHub update executed.
    Evidence: .sisyphus/evidence/task-5-mutation-create-update-error.txt
  ```

  **Commit**: YES | Message: `refactor(features): Route create and update actions to issues.` | Files: `actions/feature.ts`, `components/editor/feature-editor.tsx`

- [ ] 6. Migrate Comments and Explanation Flows

  **What to do**: Replace `addFeatureComment` and `updateFeatureExplanation` to issue comment operations, including deterministic explanation marker storage and retrieval.
  **Must NOT do**: Do not mix explanation content with normal comments without an explicit marker.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: two related mutation flows with subtle parsing rules.
  - Skills: `[]` — no external skill needed.
  - Omitted: `['playwright']` — API/action logic scope.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [7,9] | Blocked By: [1,2,3]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `actions/feature.ts:86` — explanation authorization and update behavior.
  - Pattern: `actions/feature.ts:169` — comment creation behavior.
  - Pattern: `app/(dashboard)/features/[id]/feature-explanation.tsx:6` — explanation edit entry point.
  - Pattern: `app/(dashboard)/features/[id]/feature-comments.tsx:28` — comment submit flow.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Comment action appends issue comment and returns UI-compatible comment shape.
  - [ ] Explanation action updates only explanation-marked content and preserves auth checks.
  - [ ] Detail page parser separates explanation from normal comment list.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Comments/explanation happy path
    Tool: Bash
    Steps: Add a normal comment, then update explanation via UI path.
    Expected: Normal comment appears in comment thread; explanation area shows latest marked content.
    Evidence: .sisyphus/evidence/task-6-comments-explanation.txt

  Scenario: Explanation auth failure
    Tool: Bash
    Steps: Non-assignee/non-admin attempts explanation update.
    Expected: Forbidden-equivalent error and no explanation comment mutation.
    Evidence: .sisyphus/evidence/task-6-comments-explanation-error.txt
  ```

  **Commit**: YES | Message: `refactor(features): Migrate comments and explanation to issues.` | Files: `actions/feature.ts`, `app/(dashboard)/features/[id]/page.tsx`


## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit 1: `refactor(features): Switch feature reads to GitHub Issues.`
- Commit 2: `refactor(features): Route feature mutations through GitHub APIs.`
- Commit 3: `chore(features): Add compatibility mapping and verification safeguards.`

## Success Criteria
- Features module no longer depends on Prisma `Feature`/`FeatureComment` for runtime reads/writes.
- End-user feature workflows are behavior-compatible with current product expectations.
- Identity recording in open issues is visible and consistent with requested policy.
- Rate-limit failures, partial failures, and permission errors are handled predictably.
