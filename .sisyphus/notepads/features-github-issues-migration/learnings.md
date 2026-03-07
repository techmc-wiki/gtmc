# Learnings

## [2026-03-12] Initial Codebase Analysis

### GitHub API pattern (from actions/admin.ts:62-84)
```typescript
const response = await fetch(
  `https://api.github.com/repos/${repoOwner}/${repoName}/...`,
  {
    method: "POST",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${githubToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ... }),
  }
);
```

### Env vars already in use
- `GITHUB_REPO_OWNER` — repo owner (admin.ts:65)
- `GITHUB_REPO_NAME` — repo name (admin.ts:66)
- `QQ_BOT_WEBHOOK` — QQ bot webhook URL (feature.ts:7)
- `NEXT_PUBLIC_APP_URL` — public URL for QQ notification (feature.ts:56)
- NEW NEEDED: `GITHUB_SYSTEM_PAT` — system-level PAT for issues (admin uses per-user PAT, features needs a system token)

### Feature data shape (from Prisma schema)
- id: cuid string
- title, content: string
- explanation?: string (nullable)
- tags: string[]
- status: "PENDING" | "IN_PROGRESS" | "RESOLVED"
- authorId, assigneeId?: string (app user IDs)
- comments: FeatureComment[] with id, content, featureId, authorId, createdAt

### Feature list page prop contract (feature-list.tsx)
Uses `features: any[]` with these accessed fields:
- feature.id — used in `href={/features/${feature.id}}`
- feature.status — StatusBadge and filter
- feature.tags — tag filter and display
- feature.author?.name — display
- feature.assignee?.name — display
- feature.createdAt — date display
- feature.title — title display

### Feature detail page uses
- feature.id, feature.authorId, feature.assigneeId — for auth checks
- feature.author.name/email — display
- feature.assignee?.name/email — display
- feature.status — StatusBadge
- feature.explanation — for FeatureExplanation
- feature.title, feature.content, feature.tags — editor initialData
- feature.comments[] — comment list

### Comment shape (feature-comments.tsx)
```typescript
interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  author: { name: string | null; email: string | null; image: string | null; }
}
```

### FeatureEditor redirect (feature-editor.tsx:156)
```typescript
router.push(`/features/${res.feature.id}`);
```
So createFeature must return `{ success: true, feature: { id: string, ... } }`

### ID Strategy (decision locked)
- Local index starting at 0 (NOT GitHub issue number directly in URL)
- Need a mapping: local_index → github_issue_number
- Local index is position in the full ordered list of issues (sorted by created_at asc)
- The simplest approach: fetch all issues, sort by created_at, the index IS the position
- This means listing ALL issues on every create/detail lookup to determine index — OR store mapping in GitHub issue body metadata
- RECOMMENDED: Store local_index in issue body metadata on create (so detail lookup can find by scanning or by querying by label/title metadata)
- Actually simpler: use GitHub issue number directly as the URL ID but with a "gh-" prefix or just use issue number as numeric ID
- WAIT — decision says "local index starting at 0, mapped to GitHub issue numbers"
- This means: feature 0 → GH issue #5, feature 1 → GH issue #7 (skipping PRs), etc.
- Implementation: on list, fetch all issues (filtered, no PRs), sort by created_at asc, index 0 = first
- This makes index = position in the sorted list — dynamic, changes if issues are created in different orders

### QQ Bot notification
- sendQQBotNotification called on createFeature only
- URL: `${NEXT_PUBLIC_APP_URL}/features/${feature.id}`
- feature.id must be the local index (integer) after migration

### revalidatePath calls
- `/features` — on create, update, assign, unassign, resolve
- `/features/${id}` — on update, explanation, assign, unassign, resolve, comment
- After migration, id = local index integer

## [2026-03-12] Task 1 implementation learnings

### `lib/github-features.ts` API contract
- Added typed normalized models: `GithubIssue`, `GithubComment`
- Added explicit typed error model: `GithubFeaturesError` with `code`, `status`, `details`
- Implemented `listAllIssues` + alias `listIssues` to satisfy both naming variants in task docs

### GitHub REST pagination and filtering
- Implemented full pagination via `Link` header parsing (`rel="next"`) and looped fetch until exhausted
- Confirmed issue list must filter out entries with `pull_request` key to exclude PRs
- Applied pagination to `listIssueComments` as well for completeness

### Error semantics encoded
- Missing env vars now throw `CONFIG_MISSING` with explicit required key names (no token leakage)
- 401/403 auth failures throw `AUTH_FAILED`, while rate-limit cases (429 or 403 + rate-limit signals) throw `RATE_LIMITED`
- `getIssue` returns `null` on 404 exactly as required; other non-2xx paths throw structured `API_ERROR`

## [2026-03-12] Task 3 mapping rules centralization

### Centralized status/label decisions in `lib/github-features.ts`
- Added exported `APP_STATUS_LABELS` and `STATUS_LABEL_COLORS` for a single source of truth.
- Added pure mapping helpers: `statusToLabels`, `labelsToStatus`, `issueStateForStatus`, `tagsToLabels`, `labelsToTags`.
- `labelsToStatus` intentionally defaults to `PENDING` when no recognized `status:*` label exists to handle externally created issues.

### Explanation marker detection constants
- Added exported `EXPLANATION_MARKER` and `METADATA_MARKER` constants so body parsing/detection uses shared marker literals.

## [2026-03-12] Task 2: Identity Metadata Serialization

### Metadata format conventions
- Issue body uses multi-line HTML comment blocks: `<!-- GTMC_METADATA\n{json}\n-->`
- Comment body uses single-line HTML comment: `<!-- GTMC_COMMENT_META {json} -->`
- Explanation block is optional: `<!-- GTMC_EXPLANATION\n{text}\n-->`
- All metadata is PUBLIC in the body (design decision: "公开详细身份")

### Parse robustness pattern
- Parse functions NEVER throw — return `null` metadata + `parseError` string
- `parseMetadata<T>` helper validates `appUserId` is string, coerces nullable fields
- Empty/missing body returns full body as `userContent` with `metadata: null`

### Type structure
- `IssueMetadata` and `CommentMetadata` are structurally identical (appUserId, authorName, authorEmail)
- `appUserId` maps to `session.user.id` (cuid), NOT GitHub user ID
- `authorName` and `authorEmail` are `string | null` matching User model

### Serialization constants
- Marker strings are module-level constants (METADATA_START, COMMENT_META_PREFIX, etc.)
- `serializeMetadata()` and `parseMetadata()` are private helpers shared by both issue and comment serializers

### File organization
- New code appended after existing API functions (line 510+)
- Section divider comments used to separate API code from serialization code in the 700+ line file

## [2026-03-12] Task 4 migration prep learnings

### Locked SSR read migration constraints
- Both feature list/detail SSR pages must stop using Prisma reads and derive app-facing feature objects from GitHub issues helpers.
- URL id strategy is local index (0-based) over all issues sorted by `createdAt` ascending; detail lookup must fetch all issues, sort ASC, and index into that array.
- Detail page must still include resolved (closed) items, so it must use `listAllIssues("all")` and call `notFound()` for invalid/non-existent indices.

### Data-mapping requirements to preserve component contracts
- Keep list/detail prop shapes stable (`id`, `status`, `tags`, `author`, `assignee`, `createdAt`, `title`, `content`, `explanation`, `comments`) while sourcing from helpers.
- `authorId` for auth checks comes from `parseIssueBody(...).metadata.appUserId`; `assigneeId`/identity must come from optional metadata fields and fall back to null.
- Comment records must be built from `listIssueComments` + `parseCommentBody`, with author identity from comment metadata and explanation/system-marker comments filtered out.

## [2026-03-12] Task 6: Comments and explanation migration

### addFeatureComment migration
- Replaced `db.featureComment.create` with `serializeCommentBody` + `addIssueComment`
- Comment metadata includes `appUserId`, `authorName`, `authorEmail` from session
- Return shape matches `feature-comments.tsx` interface: `{ id: string, content: string, createdAt: Date, author: { name, email, image } }`
- `content` in return is the raw user content, NOT the serialized body with metadata prefix
- `(session.user as any).image` cast needed since `image` isn't in the session type

### updateFeatureExplanation migration
- Replaced `db.feature.update({explanation})` with `parseIssueBody` → `serializeIssueBody` → `updateIssue`
- Authorization now checks `(parsed.metadata as any)?.assigneeId` since `IssueMetadata` doesn't have `assigneeId` yet (Task 7 will add it)
- Empty explanation passed as `undefined` to `serializeIssueBody` to avoid writing empty explanation blocks
- Fallback metadata `{ appUserId: "", authorName: null, authorEmail: null }` used when `parsed.metadata` is null

### Helper functions added
- `getIssueNumberByIndex(localIndex)` — fetches all issues, sorts by createdAt ASC, returns issue.number at index
- `getFeatureByIndex(localIndex)` — same but returns `{ issue, parsed }` with parsed body
- Both are module-level (non-exported) in `actions/feature.ts` for reuse by Tasks 5 and 7

## [2026-03-12] Task 5: createFeature and updateFeature migration

### createIssue signature
- `createIssue(title: string, body: string, labels: string[])` — positional args, NOT an object `{title, body, labels}`
- Returns `GithubIssue` with `.number`, `.title`, `.body`, `.labels`, `.createdAt`, etc.

### createFeature implementation
- Build metadata with `IssueMetadata { appUserId, authorName, authorEmail }` from session
- Serialize body via `serializeIssueBody(content, metadata, undefined)` — explanation is undefined on create
- Ensure each tag label exists via `ensureLabel(tag)` loop
- Labels = `[...tagsToLabels(tags), ...statusToLabels("PENDING")]`
- After create, fetch all issues to determine local index: `listAllIssues("all")` → sort by createdAt ASC → `findIndex` by `created.number`
- Return `{ success: true, feature: { id: String(localIndex), title, content, tags } }`
- QQ Bot URL uses `localIndex` (integer), not cuid

### updateFeature implementation
- `id` param is local index string → `parseInt(id, 10)` with NaN guard
- Uses existing `getFeatureByIndex(localIndex)` helper for lookup
- Auth: `parsed.metadata?.appUserId !== session.user.id && session.user.role !== "ADMIN"` → Forbidden
- Preserves current status via `labelsToStatus(issue.labels)` → `statusToLabels(currentStatus)`
- Preserves explanation via `parsed.explanation ?? undefined`
- Fallback metadata `{ appUserId: "", authorName: null, authorEmail: null }` when `parsed.metadata` is null
- Calls `updateIssue(issue.number, { title, body, labels })` — object form for update

### Prisma import kept
- `prisma as db` import remains because `assignFeature`, `unassignFeature`, `resolveFeature` still use `db.feature.update`

## [2026-03-12] Task 7: assignment/unassignment/resolution migration

### Action migration details
- `assignFeature` now parses local index id, loads issue via `getFeatureByIndex`, updates body metadata assignee fields, sets labels to tags + `status:in-progress`, and returns `{ success: true, feature: { id } }`.
- `unassignFeature` now parses local index id, clears assignee metadata fields in body, sets labels to tags + `status:pending`, and returns `{ success: true, feature: { id } }`.
- `resolveFeature` now parses local index id, enforces admin-only auth, sets labels to tags + `status:resolved`, closes issue via `setIssueState(issueNumber, "closed")`, and posts optional resolution comment through `addIssueComment`.

### GitHub assignee sync behavior
- Assignee sync uses `setIssueAssignees` as best-effort and is wrapped in try/catch so collaborator restrictions do not fail server actions.
- Unassign path clears GitHub assignees with `setIssueAssignees(issueNumber, [])` in best-effort mode.

### Cleanup
- Removed Prisma dependency from `actions/feature.ts` after migrating all remaining write actions away from `db.feature` / `db.featureComment`.

## [2026-03-12] Task 8: Canonical ID format verification

### Verification result: ALL CLEAR — no changes needed
- **page.tsx**: Already has full guard — `Number.parseInt(id, 10)` with `Number.isNaN || < 0 → notFound()`, then `allIssues[localIndex] → notFound()` if out of range. Feature object uses `id: String(localIndex)`.
- **feature-actions.tsx**: `featureId: string` prop passed directly to server actions which all accept `id: string` and parse with `parseInt(id, 10)`.
- **feature-editor.tsx**: Edit mode passes `initialData.id = feature.id` = `String(localIndex)` from page.tsx. Create mode redirects to `/features/${res.feature.id}` where `res.feature.id` = `String(localIndex)`.
- **actions/feature.ts QQ Bot URL**: Uses `localIndex` (integer) directly — `/features/${localIndex}` — correct.
- **revalidatePath calls**: All use `id` which is the local index string — consistent.
- **No Prisma usage**: Zero matches for `db.feature` or `db.featureComment` in feature files.
- **No cuid patterns**: Zero matches for cuid-like strings in feature flows.
- **Build**: Feature files compile clean (0 LSP diagnostics). Pre-existing type error in `draft/page.tsx` is unrelated.

## [2026-03-12] Task 9: Caching + rate-limit safeguard verification

>> Added `export const revalidate = 60` to both `app/(dashboard)/features/page.tsx` and `app/(dashboard)/features/[id]/page.tsx`.
>> Chose route segment config over `unstable_cache` as the simplest App Router solution for these server-rendered pages.
>> Verified `auth()` remains intact in both pages; no auth/session logic was changed.
>> Confirmed there is no page-level `try/catch` swallowing GitHub read errors; `listAllIssues("all")` and `listIssueComments(...)` failures propagate to Next.js error boundary.
>> Verified `RATE_LIMITED` is thrown as `GithubFeaturesError` in `requestGithub` for both `429` and `403` with rate-limit signals (`x-ratelimit-remaining: 0` or message match).
>> Confirmed `listAllIssues("all")` already performs full pagination via `Link` header traversal (`parseNextLink` loop) and filters out pull requests.
>> Context7 check: Next.js App Router supports `export const revalidate = <seconds>` for route-level cache revalidation and documents `unstable_cache` as an optional finer-grained alternative.
