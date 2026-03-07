# Problems / Blockers

## [2026-03-12] No blockers identified yet

All pre-implementation analysis complete. Tasks can begin.

### Open Questions
1. Does the current app store `githubLogin` for users? Need to check for assignee sync.
   - Action: Check `prisma/schema.prisma` User model and `types/next-auth.d.ts`
2. What is the existing `.env` structure? Need to know if `GITHUB_SYSTEM_PAT` needs to be added to `.env.example`.
   - Action: Check `.env.example` or equivalent
