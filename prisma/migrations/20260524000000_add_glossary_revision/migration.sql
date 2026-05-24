-- CreateTable
CREATE TABLE "GlossaryRevision" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "operations" JSONB NOT NULL,
    "baseSubmoduleSha" TEXT,
    "branchName" TEXT,
    "githubPrUrl" TEXT,
    "githubPrNum" INTEGER,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlossaryRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GlossaryRevision_authorId_status_idx" ON "GlossaryRevision"("authorId", "status");

-- CreateIndex
CREATE INDEX "GlossaryRevision_updatedAt_idx" ON "GlossaryRevision"("updatedAt");

-- AddForeignKey
ALTER TABLE "GlossaryRevision" ADD CONSTRAINT "GlossaryRevision_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
