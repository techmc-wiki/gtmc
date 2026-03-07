# Decisions

## [2026-03-12] Confirmed from plan (Decision Locks)

1. **ID Strategy**: Local index starting at 0, mapped to GitHub issue numbers.
   - Implementation: fetch all issues (no PRs), sort by created_at ASC, position = local index
   - The URL `/features/0` = first ever issue, `/features/1` = second, etc.
   
2. **Historical Data**: No migration needed (test data only, clean cut).

3. **Tag Mapping**: App tags → GitHub labels.
   - Label format: use tag name as-is (e.g. "bug", "enhancement")
   - Auto-create labels if they don't exist (use labels API)
   - Status labels: "status:pending", "status:in-progress", "status:resolved" — prefixed with "status:" to distinguish

4. **Explanation Storage**: Explanation stored in issue body as structured section.
   - Issue body format:
     ```
     <!-- GTMC_METADATA
     {"authorId":"...","authorName":"...","authorEmail":"...","appUserId":"..."}
     -->
     
     {user content}
     
     <!-- GTMC_EXPLANATION
     {explanation content here}
     -->
     ```
   - Normal comments = GitHub issue comments (no marker)
   - Resolution note from resolveFeature = special comment with `[Resolution]:` prefix

5. **Assignee Representation**: App assignee syncs to GitHub assignee.
   - GitHub assignee requires user to be a repo collaborator
   - Implementation: try to sync, log warning if user not a collaborator, don't fail the app action
   - Store assignee identity in issue body metadata (not just GitHub assignee)

## [2026-03-12] New decisions made during analysis

6. **System Token**: Use `GITHUB_SYSTEM_PAT` env var for all GitHub Issues write operations.
   - This is a system/bot PAT, not per-user (unlike admin.ts which uses per-admin PAT)
   - Issues will appear authored by the bot account

7. **Explanation marker format**: Use HTML comments in issue body to separate sections.
   - Metadata section: `<!-- GTMC_METADATA\n{json}\n-->` 
   - Explanation section: `<!-- GTMC_EXPLANATION\n{content}\n-->`
   - User content: everything between metadata and explanation markers

8. **Local index implementation**: 
   - On list page: fetch all issues → sort by created_at ASC → enumerate → index is position in list
   - On detail page `/features/[id]`: id = local index → fetch all → get item at index
   - On create: return index = total_count (after insertion, new issue is at end)
   - IMPORTANT: Index can shift if issues are deleted — but plan says no migration needed and we don't delete in this iteration
