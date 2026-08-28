BEGIN;

-- Preserve submitted drafts while retiring the website's review states.
UPDATE "Revision"
SET "status" = CASE
    WHEN "status" = 'APPROVED' THEN 'MERGED'
    WHEN "status" = 'REJECTED' THEN 'CLOSED'
    WHEN "githubPrNum" IS NOT NULL THEN 'SUBMITTED'
    ELSE 'DRAFT'
END
WHERE "status" IN ('IN_REVIEW', 'SYNC_CONFLICT', 'APPROVED', 'REJECTED');

ALTER TABLE "Revision" DROP CONSTRAINT "Revision_reviewerId_fkey";

ALTER TABLE "Revision"
    DROP COLUMN "reviewerId",
    DROP COLUMN "prBranchName",
    DROP COLUMN "syncedMainSha",
    DROP COLUMN "conflictContent",
    DROP COLUMN "rebaseState",
    DROP COLUMN "conflictMode";

DROP TABLE "ConflictResolution";

COMMIT;
