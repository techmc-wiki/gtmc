# Issues / Gotchas

## [2026-03-12] Identified during analysis

### GitHub Issues list also returns PRs
- Must filter: only include issues where `pull_request` key is ABSENT
- GitHub REST API returns both issues and PRs from `/repos/{owner}/{repo}/issues`

### Rate limits
- Authenticated PAT: 5,000 req/hr
- List page must use Next.js caching (revalidate strategy)

### Pagination
- GitHub returns max 100 per page
- Must follow `Link` header to get all pages if >100 issues

### Local index is dynamic
- If an issue is deleted on GitHub, all subsequent indices shift
- This is acceptable for now (no deletion in this iteration)
- WARNING: If GitHub issues are created outside the app (manually), they will appear in the list

### Assignee sync
- GitHub assignee requires user to be a repo collaborator
- App's assignee concept (any logged-in user can claim) may not map cleanly
- Strategy: sync assignee only if user has a githubLogin field, otherwise only store in metadata

### Feature ID in current code
- Current: `feature.id` is a cuid string (e.g. "clx1234...")
- After migration: feature ID will be a local numeric index (0, 1, 2...)
- `feature-editor.tsx:156` uses `res.feature.id` for router.push — must be the index
- `app/(dashboard)/features/[id]/page.tsx:15` uses `params.id` as string for db lookup
  - After migration: parse as integer for list position lookup

### revalidatePath with numeric ID
- Current: `revalidatePath(\`/features/${id}\`)` where id is a cuid
- After: id is a number (e.g. 0), so revalidatePath(`/features/0`) is correct
- BUT: in actions, when we receive `id` parameter, it's the local index (string that parses to int)
