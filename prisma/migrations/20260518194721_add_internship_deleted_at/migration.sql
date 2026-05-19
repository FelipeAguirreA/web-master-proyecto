-- AlterTable
ALTER TABLE "internships" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "internships_deletedAt_idx" ON "internships"("deletedAt");
